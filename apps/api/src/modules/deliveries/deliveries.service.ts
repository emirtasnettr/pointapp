import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppRole,
  CourierOnboardingStatus,
  DeliveryStatus,
  DeliveryType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  UserStatus,
  VehicleType,
} from '@prisma/client';
import { trPhoneLookupVariants } from '../../common/tr-phone.util';
import { staffMaySetManualDeliveryPrice } from '../auth/rbac/staff-permissions';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigService } from '../settings/system-config.service';
import { DeliveryPricingService } from './delivery-pricing.service';
import { CreateDeliveryBodyDto, CreateDeliveryDto } from './dto/create-delivery.dto';
import type { DeliveryQuoteBodyDto } from './dto/delivery-quote.dto';
import { CustomerListDeliveriesDto } from './dto/customer-list-deliveries.dto';
import { ListDeliveriesDto } from './dto/list-deliveries.dto';
import type { StaffSetDeliveryStatusDto } from './dto/staff-set-delivery-status.dto';
import { customerDisplayName, customerSenderName } from './customer-display-name.util';
import { creditCourierDeliveryEarning, syncCourierPendingFromActiveDeliveries } from './courier-wallet.util';
import { addCalendarDaysIstanbul, formatYmdIstanbul, istanbulYmdToUtcBounds } from './istanbul-calendar';
import { deliveryCustomerInvoiceFileName } from './delivery-customer-invoice.constants';

const MANUAL_DELIVERY_STATUS_ROLES: ReadonlySet<AppRole> = new Set([
  AppRole.SYSTEM_ADMIN,
  AppRole.GENERAL_MANAGER,
  AppRole.OPERATIONS_MANAGER,
  AppRole.OPERATIONS_SPECIALIST,
]);

/** Sipariş JSON’unda müşteri/kurye görünen adı için `user` + kurumsal unvan. */
export const deliveryInclude = {
  customer: {
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  },
  courier: {
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

function courierDisplayName(courier: { user: { firstName: string | null; lastName: string | null } }) {
  return [courier.user.firstName, courier.user.lastName]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Müşteri arayüzü: "Emir T." — ad tam, soyadın yalnızca ilk harfi (tr-TR büyük harf). */
function courierDisplayNameMasked(courier: { user: { firstName: string | null; lastName: string | null } }) {
  const first = (courier.user.firstName ?? '').trim();
  const last = (courier.user.lastName ?? '').trim();
  if (!first && !last) return null;
  const lastGraphemes = Array.from(last);
  const lastInitial =
    lastGraphemes.length > 0 ? lastGraphemes[0]!.toLocaleUpperCase('tr-TR') : '';
  if (first && lastInitial) return `${first} ${lastInitial}.`;
  if (first) return first;
  if (lastInitial) return `${lastInitial}.`;
  return null;
}

const deliveryCustomerInvoiceLinksInclude = {
  customerInvoiceLinks: {
    orderBy: { invoice: { createdAt: 'desc' as const } },
    include: {
      invoice: {
        include: {
          file: { select: { id: true, mime: true, path: true } },
          deliveries: {
            select: { delivery: { select: { id: true, orderNumber: true } } },
          },
        },
      },
    },
  },
} as const;

const deliveryWithLogsInclude = {
  ...deliveryInclude,
  ...deliveryCustomerInvoiceLinksInclude,
  statusLogs: { orderBy: { createdAt: 'asc' as const } },
} as const;

const deliveryListInclude = {
  ...deliveryInclude,
  _count: { select: { customerInvoiceLinks: true } },
} as const;

type DeliveryRow = Prisma.DeliveryGetPayload<{ include: typeof deliveryInclude }>;
type DeliveryListRow = Prisma.DeliveryGetPayload<{ include: typeof deliveryListInclude }>;
type DeliveryWithLogsRow = Prisma.DeliveryGetPayload<{ include: typeof deliveryWithLogsInclude }>;

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
    private readonly pricing: DeliveryPricingService,
  ) {}

  serialize(d: DeliveryRow) {
    return this.toJson(d);
  }

  /** Kurye API — müşteri telefonları gönderilmez. */
  serializeForCourier(d: DeliveryRow) {
    return this.toJsonForCourier(d);
  }

  private toJson(d: DeliveryRow | DeliveryListRow) {
    const invoiceCount =
      '_count' in d && d._count ? d._count.customerInvoiceLinks : undefined;
    return {
      id: d.id,
      orderNumber: d.orderNumber,
      status: d.status,
      type: d.type,
      description: d.description,
      notes: d.notes,
      weightKg: d.weightKg != null ? d.weightKg.toString() : null,
      vehicleType: d.vehicleType,
      pickupAddress: d.pickupAddress,
      dropoffAddress: d.dropoffAddress,
      senderName: d.senderName,
      senderPhone: d.senderPhone,
      recipientName: d.recipientName,
      recipientPhone: d.recipientPhone,
      priceBreakdown: d.priceBreakdown,
      totalPrice: d.totalPrice.toString(),
      commissionRate: d.commissionRate.toString(),
      commissionAmount: d.commissionAmount.toString(),
      courierEarning: d.courierEarning.toString(),
      paymentMethod: d.paymentMethod,
      paymentStatus: d.paymentStatus,
      courierId: d.courierId,
      customerId: d.customerId,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      customer: {
        publicId: d.customer.publicId,
        userId: d.customer.userId,
        displayName: customerDisplayName(d.customer) || d.customer.publicId,
      },
      courier: d.courier
        ? {
            id: d.courier.id,
            publicId: d.courier.publicId,
            userId: d.courier.userId,
            displayName: courierDisplayName(d.courier) || d.courier.publicId,
            displayNameMasked: courierDisplayNameMasked(d.courier),
          }
        : null,
      customerInvoiceCount: invoiceCount ?? 0,
    };
  }

  private toJsonForCourier(d: DeliveryRow) {
    const row = this.toJson(d);
    const {
      senderPhone: _s,
      recipientPhone: _r,
      priceBreakdown: _pb,
      totalPrice: _tp,
      commissionRate: _cr,
      commissionAmount: _ca,
      ...safe
    } = row;
    return safe;
  }

  private async allocateOrderNumber(tx: Prisma.TransactionClient): Promise<number> {
    const row = await tx.orderNumberSequence.findUnique({ where: { id: 1 } });
    if (!row) {
      await tx.orderNumberSequence.create({ data: { id: 1, nextValue: 1_000_002 } });
      return 1_000_001;
    }
    const n = row.nextValue;
    await tx.orderNumberSequence.update({ where: { id: 1 }, data: { nextValue: n + 1 } });
    return n;
  }

  /** Tek metin: sipariş no (tam, # isteğe bağlı), müşteri/kurye adı veya publicId. Boşlukla ayrılmış çoklu kelimede hepsi AND. */
  private deliverySearchFilter(raw: string | undefined): Prisma.DeliveryWhereInput | null {
    const trimmed = raw?.trim();
    if (!trimmed) return null;
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (!tokens.length) return null;
    const mode = Prisma.QueryMode.insensitive;

    const orForToken = (tok: string): Prisma.DeliveryWhereInput[] => {
      const branches: Prisma.DeliveryWhereInput[] = [
        { customer: { publicId: { contains: tok, mode } } },
        { customer: { companyName: { contains: tok, mode } } },
        { customer: { user: { firstName: { contains: tok, mode } } } },
        { customer: { user: { lastName: { contains: tok, mode } } } },
        { courier: { publicId: { contains: tok, mode } } },
        { courier: { user: { firstName: { contains: tok, mode } } } },
        { courier: { user: { lastName: { contains: tok, mode } } } },
      ];
      const numStr = tok.replace(/^#/, '').trim();
      if (/^\d+$/.test(numStr) && numStr.length <= 12) {
        const n = Number(numStr);
        if (Number.isSafeInteger(n)) branches.push({ orderNumber: n });
      }
      return branches;
    };

    if (tokens.length === 1) {
      return { OR: orForToken(tokens[0]) };
    }
    return { AND: tokens.map((tok) => ({ OR: orForToken(tok) })) };
  }

  async list(q: ListDeliveriesDto) {
    const skip = q.skip ?? 0;
    const take = q.take ?? 50;
    const where: Prisma.DeliveryWhereInput = {};
    if (q.status) {
      where.status = q.status;
    } else if (q.excludeDelivered) {
      where.status = { not: DeliveryStatus.DELIVERED };
    }
    if (q.customerPublicId) {
      where.customer = { publicId: q.customerPublicId };
    }
    if (q.courierPublicId) {
      where.courier = { publicId: q.courierPublicId };
    }
    if (q.fromDate && q.toDate) {
      if (q.fromDate > q.toDate) {
        throw new BadRequestException('Başlangıç tarihi bitişten sonra olamaz');
      }
      let start: Date;
      let end: Date;
      try {
        start = istanbulYmdToUtcBounds(q.fromDate).gte;
        end = istanbulYmdToUtcBounds(q.toDate).lte;
      } catch {
        throw new BadRequestException('Geçersiz tarih formatı');
      }
      const maxSpanMs = 366 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > maxSpanMs) {
        throw new BadRequestException('Tarih aralığı en fazla 366 gün olabilir');
      }
      where.createdAt = { gte: start, lte: end };
    } else if (q.fromDate || q.toDate) {
      throw new BadRequestException('fromDate ve toDate birlikte gönderilmelidir');
    }

    const searchClause = this.deliverySearchFilter(q.search);
    if (searchClause) {
      const keys = Object.keys(where).filter((k) => (where as Record<string, unknown>)[k] !== undefined);
      if (keys.length === 0) {
        Object.assign(where, searchClause);
      } else {
        const rest = { ...where };
        for (const k of keys) delete (where as Record<string, unknown>)[k];
        where.AND = [rest, searchClause];
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: deliveryListInclude,
      }),
      this.prisma.delivery.count({ where }),
    ]);
    return { items: rows.map((d) => this.toJson(d)), total, skip, take };
  }

  /** Operasyon paneli: tüm teslimatlar için durum özetleri (groupBy). */
  async staffDeliveryStats() {
    const rows = await this.prisma.delivery.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const byStatus = new Map<DeliveryStatus, number>();
    for (const r of rows) {
      byStatus.set(r.status, r._count.id);
    }
    let total = 0;
    for (const n of byStatus.values()) total += n;
    const delivered = byStatus.get(DeliveryStatus.DELIVERED) ?? 0;
    const cancelled = byStatus.get(DeliveryStatus.CANCELLED) ?? 0;
    const onTheWay =
      (byStatus.get(DeliveryStatus.COURIER_EN_ROUTE) ?? 0) +
      (byStatus.get(DeliveryStatus.PACKAGE_PICKED_UP) ?? 0);
    return { total, delivered, onTheWay, cancelled };
  }

  /**
   * Oluşturulmasından en az 30 dk geçmiş, hâlâ kurye atanmamış (beklemede / havuz) teslimatlar.
   * Operasyon paneli acil alanı için; eski kayıt önce.
   */
  async staffUrgentNoCourierDeliveries() {
    const threshold = new Date(Date.now() - 30 * 60 * 1000);
    const rows = await this.prisma.delivery.findMany({
      where: {
        courierId: null,
        status: { in: [DeliveryStatus.PENDING, DeliveryStatus.POOL] },
        createdAt: { lte: threshold },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: deliveryInclude,
    });
    return {
      items: rows.map((d) => ({
        id: d.id,
        orderNumber: d.orderNumber,
        type: d.type,
        createdAt: d.createdAt.toISOString(),
        customer: {
          publicId: d.customer.publicId,
          displayName: customerDisplayName(d.customer) || d.customer.publicId,
        },
      })),
    };
  }

  async listForCustomerUser(userId: string, q: CustomerListDeliveriesDto) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { publicId: true },
    });
    if (!profile) {
      const skip = q.skip ?? 0;
      const take = q.take ?? 50;
      return { items: [], total: 0, skip, take };
    }
    const hasFrom = Boolean(q.fromDate?.trim());
    const hasTo = Boolean(q.toDate?.trim());
    const today = formatYmdIstanbul(new Date());
    let fromYmd: string;
    let toYmd: string;
    if (hasFrom && hasTo) {
      fromYmd = q.fromDate!.trim();
      toYmd = q.toDate!.trim();
    } else if (hasFrom) {
      fromYmd = q.fromDate!.trim();
      toYmd = today;
    } else if (hasTo) {
      toYmd = q.toDate!.trim();
      fromYmd = addCalendarDaysIstanbul(toYmd, -6);
    } else {
      toYmd = today;
      fromYmd = addCalendarDaysIstanbul(toYmd, -6);
    }
    return this.list({
      customerPublicId: profile.publicId,
      status: q.status,
      skip: q.skip,
      take: q.take,
      fromDate: fromYmd,
      toDate: toYmd,
    });
  }

  /** Misafir / üyeliksiz web gönderisi — sistem misafir müşteri profiline bağlanır. */
  private guestCustomerIdCache: string | null = null;

  static readonly GUEST_CUSTOMER_PUBLIC_ID = 'BM000099';

  async resolveGuestCustomerId(): Promise<string> {
    if (this.guestCustomerIdCache) return this.guestCustomerIdCache;
    const row = await this.prisma.customerProfile.findUnique({
      where: { publicId: DeliveriesService.GUEST_CUSTOMER_PUBLIC_ID },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(
        'Misafir gönderi hesabı yapılandırılmamış. `npm run db:seed` ile BM000099 profilini oluşturun.',
      );
    }
    this.guestCustomerIdCache = row.id;
    return row.id;
  }

  async createForGuest(dto: CreateDeliveryBodyDto) {
    const customerId = await this.resolveGuestCustomerId();
    const { totalPrice: _tp, commissionRate: _cr, ...rest } = dto;
    return this.create({
      ...rest,
      customerId,
      senderName: dto.senderName.trim(),
      paymentMethod: PaymentMethod.CARD,
    });
  }

  async createForCustomerUser(userId: string, dto: CreateDeliveryBodyDto) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        type: true,
        companyName: true,
        user: { select: { firstName: true, lastName: true, phone: true } },
      },
    });
    if (!profile) {
      throw new ForbiddenException('Müşteri profili bulunamadı');
    }

    const senderName = customerSenderName(profile);
    if (!senderName) {
      throw new BadRequestException(
        'Gönderici adı için profilinizde ad soyad veya şirket ünvanı tanımlı olmalıdır.',
      );
    }

    const submitted = dto.senderName?.trim();
    if (submitted && submitted.localeCompare(senderName, 'tr', { sensitivity: 'base' }) !== 0) {
      throw new BadRequestException(
        'Gönderici adı yalnızca hesabınızdaki kayıtlı ad veya şirket ünvanı ile oluşturulabilir.',
      );
    }

    const { totalPrice: _tp, commissionRate: _cr, ...rest } = dto;
    return this.create({
      ...rest,
      customerId: profile.id,
      senderName,
    });
  }

  async quoteForCustomerUser(userId: string, dto: DeliveryQuoteBodyDto) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new ForbiddenException('Müşteri profili bulunamadı');
    }

    const pickup = await this.resolveQuoteGeoForCustomer(
      profile.id,
      dto.pickupSavedAddressId,
      dto.pickupDistrictId,
      dto.pickupNeighborhoodId,
      'Alış',
    );
    const dropoff = await this.resolveQuoteGeoForCustomer(
      profile.id,
      dto.dropoffSavedAddressId,
      dto.dropoffDistrictId,
      dto.dropoffNeighborhoodId,
      'Teslim',
    );

    let vehicleType = dto.vehicleType;
    if (
      dto.type === DeliveryType.PACKAGE &&
      dto.weightKg != null &&
      dto.weightKg > 20
    ) {
      vehicleType = VehicleType.CAR;
    }

    return this.pricing.quote({
      type: dto.type,
      vehicleType,
      weightKg: dto.weightKg,
      pickupNeighborhoodId: pickup.neighborhoodId,
      pickupDistrictId: pickup.districtId,
      dropoffNeighborhoodId: dropoff.neighborhoodId,
      dropoffDistrictId: dropoff.districtId,
    });
  }

  private async resolveQuoteGeoForCustomer(
    customerProfileId: string,
    savedAddressId: string | undefined,
    districtId: string | undefined,
    neighborhoodId: string | undefined,
    label: string,
  ): Promise<{ districtId: string; neighborhoodId: string }> {
    if (savedAddressId?.trim()) {
      const row = await this.prisma.customerSavedAddress.findFirst({
        where: { id: savedAddressId.trim(), customerId: customerProfileId },
        select: {
          neighborhood: {
            select: {
              id: true,
              district: { select: { id: true, active: true } },
              active: true,
            },
          },
        },
      });
      if (!row?.neighborhood?.active || !row.neighborhood.district.active) {
        throw new BadRequestException(`${label} adresi hizmet dışı`);
      }
      return {
        neighborhoodId: row.neighborhood.id,
        districtId: row.neighborhood.district.id,
      };
    }
    if (!districtId?.trim() || !neighborhoodId?.trim()) {
      throw new BadRequestException(`${label} için ilçe ve mahalle seçin`);
    }
    return { districtId: districtId.trim(), neighborhoodId: neighborhoodId.trim() };
  }

  private mapCustomerInvoices(row: DeliveryWithLogsRow) {
    return row.customerInvoiceLinks.map((link) => {
      const inv = link.invoice;
      const orderNumbers = inv.deliveries
        .map((x) => x.delivery.orderNumber)
        .sort((a, b) => a - b);
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        note: inv.note,
        mime: inv.file.mime,
        fileName: deliveryCustomerInvoiceFileName(inv.file.path, inv.file.mime),
        createdAt: inv.createdAt.toISOString(),
        orderNumbers,
        deliveryCount: orderNumbers.length,
      };
    });
  }

  private toJsonWithLogs(row: DeliveryWithLogsRow) {
    const { statusLogs, customerInvoiceLinks: _links, ...rest } = row;
    return {
      ...this.toJson(rest),
      statusLogs: this.mapStatusLogs(statusLogs),
      customerInvoices: this.mapCustomerInvoices(row),
    };
  }

  private toJsonWithLogsForCourier(row: DeliveryWithLogsRow) {
    const { statusLogs, ...rest } = row;
    return {
      ...this.toJsonForCourier(rest),
      statusLogs: this.mapStatusLogs(statusLogs),
    };
  }

  private mapStatusLogs(
    statusLogs: DeliveryWithLogsRow['statusLogs'],
  ) {
    return statusLogs.map((l) => ({
        id: l.id,
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        actorType: l.actorType,
        actorId: l.actorId,
        createdAt: l.createdAt.toISOString(),
        meta: l.meta,
      }));
  }

  /** Havuz listesi — kurye paneli. */
  async listPoolForCourier() {
    const rows = await this.prisma.delivery.findMany({
      where: { status: DeliveryStatus.POOL, courierId: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: deliveryInclude,
    });
    return {
      items: rows.map((d) => this.serializeForCourier(d)),
      total: rows.length,
    };
  }

  /** Operasyon paneli: kurye seçici için aktif kuryeler. */
  async listCouriersForStaffPick() {
    const rows = await this.prisma.courierProfile.findMany({
      where: {
        user: { status: UserStatus.ACTIVE },
        onboardingStatus: CourierOnboardingStatus.APPROVED,
      },
      take: 400,
      orderBy: { publicId: 'asc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      items: rows.map((c) => ({
        id: c.id,
        publicId: c.publicId,
        type: c.type,
        vehicleType: c.vehicleType,
        displayName: courierDisplayName(c) || c.publicId,
      })),
    };
  }

  /**
   * Havuz / bekleyen siparişe kurye atar veya "Kurye atandı" iken kuryeyi değiştirir.
   * Yolda / paket alındı aşamalarında kullanılmaz.
   */
  async staffAssignCourier(
    staffUserId: string,
    staffProfileId: string,
    ref: string,
    courierPublicId: string,
  ) {
    const pid = courierPublicId.trim();
    if (!pid) throw new BadRequestException('Kurye seçilmelidir');

    const courier = await this.prisma.courierProfile.findUnique({
      where: { publicId: pid },
      include: { user: { select: { status: true } } },
    });
    if (!courier) throw new NotFoundException('Kurye bulunamadı');
    if (courier.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Yalnızca aktif hesaplı kuryelere atanabilir');
    }

    const r = ref.trim();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.delivery.findFirst({
        where: this.whereFromOrderNumberOrId(r),
      });
      if (!row) throw new NotFoundException('Teslimat bulunamadı');
      if (row.status === DeliveryStatus.DELIVERED || row.status === DeliveryStatus.CANCELLED) {
        throw new BadRequestException('Tamamlanmış veya iptal edilmiş siparişte kurye işlemi yapılamaz');
      }

      const freshPool =
        row.courierId === null &&
        (row.status === DeliveryStatus.POOL || row.status === DeliveryStatus.PENDING);
      const reassign =
        row.status === DeliveryStatus.COURIER_ASSIGNED && row.courierId !== null;

      if (!freshPool && !reassign) {
        throw new BadRequestException(
          'Kurye; havuz veya beklemedeki siparişe atanır ya da yalnızca "Kurye atandı" durumundayken değiştirilir',
        );
      }

      if (reassign && row.courierId === courier.id) {
        throw new BadRequestException('Bu kurye zaten bu siparişe atanmış');
      }

      if (freshPool) {
        await tx.delivery.update({
          where: { id: row.id },
          data: {
            courierId: courier.id,
            status: DeliveryStatus.COURIER_ASSIGNED,
            assignedByStaffId: staffProfileId,
          },
        });
        await tx.deliveryStatusLog.create({
          data: {
            deliveryId: row.id,
            fromStatus: row.status,
            toStatus: DeliveryStatus.COURIER_ASSIGNED,
            actorType: 'staff',
            actorId: staffUserId,
            meta: { action: 'staff_assign', courierPublicId: pid } as Prisma.InputJsonValue,
          },
        });
        await syncCourierPendingFromActiveDeliveries(tx, courier.id);
        return;
      }

      const prevCourierId = row.courierId!;
      const prevCourier = await tx.courierProfile.findUnique({
        where: { id: prevCourierId },
        select: { publicId: true },
      });
      await tx.delivery.update({
        where: { id: row.id },
        data: {
          courierId: courier.id,
          assignedByStaffId: staffProfileId,
        },
      });
      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: row.id,
          fromStatus: DeliveryStatus.COURIER_ASSIGNED,
          toStatus: DeliveryStatus.COURIER_ASSIGNED,
          actorType: 'staff',
          actorId: staffUserId,
          meta: {
            action: 'staff_reassign',
            fromCourierPublicId: prevCourier?.publicId ?? null,
            toCourierPublicId: pid,
          } as Prisma.InputJsonValue,
        },
      });
      await syncCourierPendingFromActiveDeliveries(tx, prevCourierId);
      await syncCourierPendingFromActiveDeliveries(tx, courier.id);
    });

    return this.getOne(r);
  }

  /** "Kurye atandı" → havuza (kurye kaldırılır). */
  async staffUnassignCourier(staffUserId: string, staffProfileId: string, ref: string) {
    const r = ref.trim();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.delivery.findFirst({
        where: this.whereFromOrderNumberOrId(r),
      });
      if (!row) throw new NotFoundException('Teslimat bulunamadı');
      if (row.status !== DeliveryStatus.COURIER_ASSIGNED || row.courierId === null) {
        throw new BadRequestException('Yalnızca "Kurye atandı" durumundaki sipariş havuza alınabilir');
      }
      const prevCourierId = row.courierId;
      await tx.delivery.update({
        where: { id: row.id },
        data: {
          courierId: null,
          status: DeliveryStatus.POOL,
          assignedByStaffId: null,
        },
      });
      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: row.id,
          fromStatus: DeliveryStatus.COURIER_ASSIGNED,
          toStatus: DeliveryStatus.POOL,
          actorType: 'staff',
          actorId: staffUserId,
          meta: { action: 'staff_unassign_to_pool', staffProfileId } as Prisma.InputJsonValue,
        },
      });
      await syncCourierPendingFromActiveDeliveries(tx, prevCourierId);
    });
    return this.getOne(r);
  }

  /**
   * Sistem yöneticisi, genel müdür, operasyon müdürü / uzmanı: teslimat durumunu manuel günceller.
   * Havuz / beklemede / iptal gibi durumlarda kurye ataması kaldırılır.
   */
  async staffSetManualDeliveryStatus(
    staffUserId: string,
    appRole: AppRole,
    ref: string,
    dto: StaffSetDeliveryStatusDto,
  ) {
    if (!MANUAL_DELIVERY_STATUS_ROLES.has(appRole)) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }
    const r = ref.trim();
    const toStatus = dto.status;

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.delivery.findFirst({
        where: this.whereFromOrderNumberOrId(r),
      });
      if (!row) throw new NotFoundException('Teslimat bulunamadı');
      if (row.status === toStatus) {
        throw new BadRequestException('Teslimat zaten bu durumda');
      }

      const needsClearCourier =
        toStatus === DeliveryStatus.POOL ||
        toStatus === DeliveryStatus.PENDING ||
        toStatus === DeliveryStatus.CANCELLED;

      const requiresCourier =
        toStatus === DeliveryStatus.COURIER_ASSIGNED ||
        toStatus === DeliveryStatus.COURIER_EN_ROUTE ||
        toStatus === DeliveryStatus.PACKAGE_PICKED_UP;

      if (requiresCourier && !row.courierId) {
        throw new BadRequestException('Bu durum için önce teslimata bir kurye atanmalıdır');
      }

      const note = dto.note?.trim();
      const courierBefore = row.courierId;

      await tx.delivery.update({
        where: { id: row.id },
        data: {
          status: toStatus,
          ...(needsClearCourier
            ? {
                courierId: null,
                assignedByStaffId: null,
              }
            : {}),
          ...(toStatus === DeliveryStatus.CANCELLED && note ? { cancelledReason: note } : {}),
        },
      });

      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: row.id,
          fromStatus: row.status,
          toStatus,
          actorType: 'staff',
          actorId: staffUserId,
          meta: {
            action: 'staff_manual_status',
            appRole,
            note: note || null,
          } as Prisma.InputJsonValue,
        },
      });

      if (toStatus === DeliveryStatus.DELIVERED && courierBefore) {
        await creditCourierDeliveryEarning(
          tx,
          courierBefore,
          row.id,
          row.orderNumber,
          row.courierEarning,
        );
      }

      if (courierBefore) {
        await syncCourierPendingFromActiveDeliveries(tx, courierBefore);
      }
    });

    return this.getOne(r);
  }

  async getOne(param: string) {
    const isDigits = /^\d+$/.test(param);
    const row = isDigits
      ? await this.prisma.delivery.findFirst({
          where: { orderNumber: Number(param) },
          include: deliveryWithLogsInclude,
        })
      : await this.prisma.delivery.findUnique({
          where: { id: param },
          include: deliveryWithLogsInclude,
        });
    if (!row) throw new NotFoundException('Teslimat bulunamadı');
    return this.toJsonWithLogs(row);
  }

  /** Havuzdaki iş veya bu kuryeye atanmış teslimat detayı (kurye paneli). */
  async getOneForCourierVisibility(courierProfileId: string, ref: string) {
    const r = ref.trim();
    const isDigits = /^\d+$/.test(r);
    const row = isDigits
      ? await this.prisma.delivery.findFirst({
          where: { orderNumber: Number(r) },
          include: deliveryWithLogsInclude,
        })
      : await this.prisma.delivery.findUnique({
          where: { id: r },
          include: deliveryWithLogsInclude,
        });
    if (!row) throw new NotFoundException('Teslimat bulunamadı');
    const inPool = row.status === DeliveryStatus.POOL && row.courierId === null;
    const assignedToMe = row.courierId === courierProfileId;
    if (!inPool && !assignedToMe) {
      throw new ForbiddenException('Bu teslimatı görüntüleyemezsiniz');
    }
    const supportLinePhone = inPool
      ? null
      : await this.systemConfig.getSupportLinePhone();
    return {
      ...this.toJsonWithLogsForCourier(row),
      supportLinePhone,
    };
  }

  /** Sipariş no veya teslimat id — yalnızca ilgili müşteri. */
  async getOneForCustomerUser(userId: string, ref: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new ForbiddenException('Müşteri profili bulunamadı');
    }
    const row = await this.prisma.delivery.findFirst({
      where: {
        ...this.whereFromOrderNumberOrId(ref),
        customerId: profile.id,
      },
      include: deliveryWithLogsInclude,
    });
    if (!row) throw new NotFoundException('Teslimat bulunamadı');
    return this.toJsonWithLogs(row);
  }

  async create(
    dto: CreateDeliveryDto,
    opts?: { staffAppRole?: AppRole; allowManualPricing?: boolean },
  ) {
    if (dto.paymentMethod === PaymentMethod.WALLET) {
      throw new BadRequestException('Cüzdan ile ödeme şu an kullanılamıyor.');
    }
    if (dto.paymentMethod === PaymentMethod.INVOICE_ACCOUNT) {
      const cp = await this.prisma.customerProfile.findUnique({
        where: { id: dto.customerId },
        select: { invoiceAccountEnabled: true },
      });
      if (!cp) {
        throw new BadRequestException('Müşteri profili bulunamadı');
      }
      if (!cp.invoiceAccountEnabled) {
        throw new BadRequestException(
          'Cari (fatura hesabı) ödemesi bu müşteri için kapalıdır. Farklı bir ödeme yöntemi seçin veya operasyonla iletişime geçin.',
        );
      }
    }

    let vehicleType = dto.vehicleType;
    let weightKgDec: Prisma.Decimal | null = null;
    if (dto.type === DeliveryType.PACKAGE) {
      if (dto.weightKg == null || Number.isNaN(Number(dto.weightKg))) {
        throw new BadRequestException('Paket gönderilerinde ağırlık (kg) zorunludur');
      }
      const packageContents = dto.description?.trim();
      if (!packageContents || packageContents.length < 3) {
        throw new BadRequestException('Paket gönderilerinde paket içeriği zorunludur (en az 3 karakter)');
      }
      weightKgDec = new Prisma.Decimal(String(dto.weightKg));
      if (weightKgDec.gt(new Prisma.Decimal(20))) {
        vehicleType = VehicleType.CAR;
      }
    }

    const description = dto.description?.trim() || null;
    const notes = dto.notes?.trim() || null;

    let total: Prisma.Decimal;
    let rate: Prisma.Decimal;
    let commissionAmount: Prisma.Decimal;
    let courierEarning: Prisma.Decimal;
    let priceBreakdown: Prisma.InputJsonValue;

    if (dto.totalPrice?.trim() && dto.commissionRate?.trim()) {
      if (!opts?.allowManualPricing) {
        throw new BadRequestException('Manuel fiyat girişine izin verilmedi');
      }
      if (!opts.staffAppRole || !staffMaySetManualDeliveryPrice(opts.staffAppRole)) {
        throw new ForbiddenException('Manuel fiyat için yetkiniz bulunmuyor');
      }
      total = new Prisma.Decimal(dto.totalPrice);
      rate = new Prisma.Decimal(dto.commissionRate);
      commissionAmount = total.mul(rate);
      courierEarning = total.sub(commissionAmount);
      priceBreakdown = { source: 'manual' };
    } else {
      const quoted = await this.pricing.quoteFromAddressSnapshots({
        type: dto.type,
        vehicleType,
        weightKg: weightKgDec != null ? Number(weightKgDec.toString()) : null,
        pickupAddress: dto.pickupAddress,
        dropoffAddress: dto.dropoffAddress,
      });
      total = new Prisma.Decimal(quoted.totalPrice);
      rate = new Prisma.Decimal(quoted.commissionRate);
      commissionAmount = new Prisma.Decimal(quoted.commissionAmount);
      courierEarning = new Prisma.Decimal(quoted.courierEarning);
      priceBreakdown = quoted.priceBreakdown as Prisma.InputJsonValue;
    }

    /** Kart ödemesi PSP onayı olmadan CAPTURED yapılmaz. */
    const initialPaymentStatus = PaymentStatus.PENDING;

    const created = await this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.allocateOrderNumber(tx);
      const campaignId = await this.resolveCampaignIdForCreate(tx, dto.customerId, dto.campaignCode);
      return tx.delivery.create({
        data: {
          orderNumber,
          customerId: dto.customerId,
          status: DeliveryStatus.POOL,
          type: dto.type,
          description,
          notes,
          weightKg: weightKgDec,
          vehicleType,
          pickupAddress: dto.pickupAddress as unknown as Prisma.InputJsonValue,
          dropoffAddress: dto.dropoffAddress as unknown as Prisma.InputJsonValue,
          senderName: dto.senderName,
          senderPhone: dto.senderPhone,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          priceBreakdown,
          totalPrice: total,
          commissionRate: rate,
          commissionAmount,
          courierEarning,
          paymentMethod: dto.paymentMethod,
          paymentStatus: initialPaymentStatus,
          campaignId,
        },
        include: deliveryInclude,
      });
    });

    return this.toJson(created);
  }

  /** Sipariş numarası (rakam) veya teslimat `id` (cuid). */
  private whereFromOrderNumberOrId(ref: string): Prisma.DeliveryWhereInput {
    const p = ref.trim();
    if (/^\d+$/.test(p)) return { orderNumber: Number(p) };
    return { id: p };
  }

  private async resolveCampaignIdForCreate(
    tx: Prisma.TransactionClient,
    customerId: string,
    campaignCode?: string,
  ): Promise<string | undefined> {
    const raw = campaignCode?.trim();
    if (!raw) return undefined;
    const code = raw.toUpperCase();
    const camp = await tx.campaign.findUnique({
      where: { code },
      select: {
        id: true,
        active: true,
        startsAt: true,
        endsAt: true,
        maxUsesPerCustomer: true,
      },
    });
    if (!camp) {
      throw new BadRequestException('Geçersiz kampanya kodu');
    }
    if (!camp.active) {
      throw new BadRequestException('Bu kampanya kodu şu an kullanılamıyor');
    }
    const now = new Date();
    if (camp.startsAt && camp.startsAt > now) {
      throw new BadRequestException('Kampanya henüz başlamadı');
    }
    if (camp.endsAt && camp.endsAt < now) {
      throw new BadRequestException('Kampanya süresi dolmuş');
    }
    if (camp.maxUsesPerCustomer != null) {
      const used = await tx.delivery.count({
        where: { campaignId: camp.id, customerId },
      });
      if (used >= camp.maxUsesPerCustomer) {
        throw new BadRequestException('Bu kampanya kodu için müşteri kullanım limitine ulaşıldı');
      }
    }
    return camp.id;
  }

  /** Havuzdaki işi üstüne al → `COURIER_ASSIGNED`. */
  async courierClaimFromPool(actorUserId: string, courierProfileId: string, ref: string) {
    const r = ref.trim();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.delivery.findFirst({
        where: this.whereFromOrderNumberOrId(r),
      });
      if (!row) throw new NotFoundException('Teslimat bulunamadı');
      if (row.status !== DeliveryStatus.POOL) {
        throw new BadRequestException('Sadece havuzdaki işler üstünüze alınabilir');
      }
      if (row.courierId !== null) {
        throw new ConflictException('Bu iş başka bir kurye tarafından alınmış olabilir');
      }
      const n = await tx.delivery.updateMany({
        where: {
          id: row.id,
          status: DeliveryStatus.POOL,
          courierId: null,
        },
        data: {
          courierId: courierProfileId,
          status: DeliveryStatus.COURIER_ASSIGNED,
        },
      });
      if (n.count !== 1) {
        throw new ConflictException('İş alınamadı; listeyi yenileyip tekrar deneyin');
      }
      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: row.id,
          fromStatus: DeliveryStatus.POOL,
          toStatus: DeliveryStatus.COURIER_ASSIGNED,
          actorType: 'courier',
          actorId: actorUserId,
          meta: { action: 'claim' } as Prisma.InputJsonValue,
        },
      });
      await syncCourierPendingFromActiveDeliveries(tx, courierProfileId);
    });
    return this.getOneForCourierVisibility(courierProfileId, r);
  }

  /** Atandı → yolda. */
  async courierMarkEnRoute(actorUserId: string, courierProfileId: string, ref: string) {
    const r = ref.trim();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.delivery.findFirst({
        where: this.whereFromOrderNumberOrId(r),
      });
      if (!row) throw new NotFoundException('Teslimat bulunamadı');
      if (row.courierId !== courierProfileId) {
        throw new ForbiddenException('Bu teslimat size atanmamış');
      }
      if (row.status !== DeliveryStatus.COURIER_ASSIGNED) {
        throw new BadRequestException('Bu adım için önce işi üstünüze almalısınız');
      }
      await tx.delivery.update({
        where: { id: row.id },
        data: { status: DeliveryStatus.COURIER_EN_ROUTE },
      });
      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: row.id,
          fromStatus: DeliveryStatus.COURIER_ASSIGNED,
          toStatus: DeliveryStatus.COURIER_EN_ROUTE,
          actorType: 'courier',
          actorId: actorUserId,
          meta: { action: 'start_route' } as Prisma.InputJsonValue,
        },
      });
    });
    return this.getOneForCourierVisibility(courierProfileId, r);
  }

  /** Yolda → paket teslim alındı. */
  async courierMarkPickedUp(actorUserId: string, courierProfileId: string, ref: string) {
    const r = ref.trim();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.delivery.findFirst({
        where: this.whereFromOrderNumberOrId(r),
      });
      if (!row) throw new NotFoundException('Teslimat bulunamadı');
      if (row.courierId !== courierProfileId) {
        throw new ForbiddenException('Bu teslimat size atanmamış');
      }
      if (row.status !== DeliveryStatus.COURIER_EN_ROUTE) {
        throw new BadRequestException('Önce yola çıktığınızı işaretleyin');
      }
      await tx.delivery.update({
        where: { id: row.id },
        data: { status: DeliveryStatus.PACKAGE_PICKED_UP },
      });
      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: row.id,
          fromStatus: DeliveryStatus.COURIER_EN_ROUTE,
          toStatus: DeliveryStatus.PACKAGE_PICKED_UP,
          actorType: 'courier',
          actorId: actorUserId,
          meta: { action: 'pickup' } as Prisma.InputJsonValue,
        },
      });
    });
    return this.getOneForCourierVisibility(courierProfileId, r);
  }

  /** Paket alındı → teslim edildi; cüzdan kazancı (varsa) eklenir. */
  async courierMarkDelivered(actorUserId: string, courierProfileId: string, ref: string) {
    const r = ref.trim();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.delivery.findFirst({
        where: this.whereFromOrderNumberOrId(r),
      });
      if (!row) throw new NotFoundException('Teslimat bulunamadı');
      if (row.courierId !== courierProfileId) {
        throw new ForbiddenException('Bu teslimat size atanmamış');
      }
      if (row.status !== DeliveryStatus.PACKAGE_PICKED_UP) {
        throw new BadRequestException('Önce paketi teslim aldığınızı işaretleyin');
      }

      await tx.delivery.update({
        where: { id: row.id },
        data: {
          status: DeliveryStatus.DELIVERED,
          paymentStatus: PaymentStatus.CAPTURED,
        },
      });
      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: row.id,
          fromStatus: DeliveryStatus.PACKAGE_PICKED_UP,
          toStatus: DeliveryStatus.DELIVERED,
          actorType: 'courier',
          actorId: actorUserId,
          meta: { action: 'complete' } as Prisma.InputJsonValue,
        },
      });

      if (row.courierEarning.gt(0)) {
        await creditCourierDeliveryEarning(
          tx,
          courierProfileId,
          row.id,
          row.orderNumber,
          row.courierEarning,
        );
      }
      await syncCourierPendingFromActiveDeliveries(tx, courierProfileId);
    });
    return this.getOneForCourierVisibility(courierProfileId, r);
  }

  /** Tanıtım sitesi: telefon ile son 5 gönderi (gönderen veya alıcı). */
  async trackByPhoneForPublic(phoneRaw: string) {
    const variants = trPhoneLookupVariants(phoneRaw);
    const rows = await this.prisma.delivery.findMany({
      where: {
        OR: variants.flatMap((v) => [{ senderPhone: v }, { recipientPhone: v }]),
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        orderNumber: true,
        status: true,
        type: true,
        createdAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        recipientName: true,
        senderName: true,
      },
    });

    return {
      items: rows.map((d) => ({
        orderNumber: d.orderNumber,
        status: d.status,
        type: d.type,
        createdAt: d.createdAt.toISOString(),
        senderName: d.senderName,
        recipientName: d.recipientName,
        pickupSummary: DeliveriesService.addressSummary(d.pickupAddress),
        dropoffSummary: DeliveriesService.addressSummary(d.dropoffAddress),
      })),
    };
  }

  private static addressSummary(addr: unknown): string {
    if (!addr || typeof addr !== 'object') return '—';
    const a = addr as Record<string, unknown>;
    const line1 = typeof a.line1 === 'string' ? a.line1.trim() : '';
    const label = typeof a.label === 'string' ? a.label.trim() : '';
    return line1 || label || '—';
  }
}
