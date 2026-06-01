import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerType,
  DeliveryStatus,
  Prisma,
  PublicIdPrefix,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { isValidTCKimlikNo, isValidTurkishVKN } from '../../common/turkish-identifiers';
import { recordCustomerConsents } from '../auth/customer-consent.util';
import { PrismaService } from '../../prisma/prisma.service';
import { latestConsentsByType } from '../auth/customer-consent.util';
import { AdjustCustomerWalletDto } from './dto/adjust-customer-wallet.dto';
import { CreateStaffCustomerDto } from './dto/create-staff-customer.dto';
import { ListStaffCustomersDto } from './dto/list-staff-customers.dto';
import { SetCourierUserStatusDto } from './dto/set-courier-user-status.dto';
import { UpdateStaffCustomerDto } from './dto/update-staff-customer.dto';

function padPublicSeq(n: number) {
  return String(n).padStart(6, '0');
}

function personName(first?: string | null, last?: string | null) {
  return [first, last]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean)
    .join(' ')
    .trim();
}

const listInclude = {
  user: { select: { email: true, firstName: true, lastName: true, status: true, phone: true } },
  _count: { select: { deliveries: true } },
} as const;

type CustomerListRow = Prisma.CustomerProfileGetPayload<{ include: typeof listInclude }>;

@Injectable()
export class StaffCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeTrMobile(raw: string): string {
    const s = raw.replace(/\s|-/g, '').trim();
    if (s.startsWith('+90')) {
      const rest = s.slice(3);
      if (/^5\d{9}$/.test(rest)) return `+90${rest}`;
      throw new BadRequestException('Geçersiz telefon numarası');
    }
    if (s.startsWith('90') && /^905\d{9}$/.test(s)) return `+${s}`;
    if (s.startsWith('0') && /^05\d{9}$/.test(s)) return `+9${s.slice(1)}`;
    if (/^5\d{9}$/.test(s)) return `+90${s}`;
    throw new BadRequestException('Geçersiz telefon numarası');
  }

  private validateCreateCustomerPayload(dto: CreateStaffCustomerDto) {
    const { customerType, companyName, taxNumber, tcKimlikNo } = dto;

    if (customerType === CustomerType.INDIVIDUAL) {
      if (!tcKimlikNo) throw new BadRequestException('Bireysel kayıtta T.C. Kimlik numarası zorunludur');
      if (taxNumber) throw new BadRequestException('Bireysel kayıtta vergi numarası kullanılamaz');
      if (companyName) throw new BadRequestException('Bireysel kayıtta şirket adı kullanılamaz');
      if (!isValidTCKimlikNo(tcKimlikNo)) {
        throw new BadRequestException('T.C. Kimlik numarası geçersiz (kontrol basamakları)');
      }
    } else if (customerType === CustomerType.CORPORATE) {
      if (!companyName?.trim()) throw new BadRequestException('Kurumsal kayıtta şirket ünvanı zorunludur');
      if (!taxNumber) throw new BadRequestException('Kurumsal kayıtta vergi numarası zorunludur');
      if (tcKimlikNo) throw new BadRequestException('Kurumsal kayıtta T.C. Kimlik numarası gönderilmemelidir');
      if (!isValidTurkishVKN(taxNumber)) {
        throw new BadRequestException('Vergi numarası geçersiz (kontrol basamakları)');
      }
    } else if (customerType === CustomerType.SOLE_PROPRIETOR) {
      if (!tcKimlikNo) throw new BadRequestException('Şahıs işletmesi kaydında T.C. Kimlik numarası zorunludur');
      if (taxNumber) throw new BadRequestException('Şahıs işletmesi kaydında vergi numarası kullanılamaz');
      if (companyName) throw new BadRequestException('Şahıs işletmesi kaydında şirket ünvanı kullanılamaz');
      if (!isValidTCKimlikNo(tcKimlikNo)) {
        throw new BadRequestException('T.C. Kimlik numarası geçersiz (kontrol basamakları)');
      }
    }
  }

  private async allocateCustomerPublicId(
    tx: Prisma.TransactionClient,
    type: CustomerType,
  ): Promise<string> {
    const prefix = type === CustomerType.CORPORATE ? PublicIdPrefix.KM : PublicIdPrefix.BM;
    const row = await tx.idSequence.findUnique({ where: { prefix } });
    if (!row) {
      await tx.idSequence.create({ data: { prefix, nextValue: 2 } });
      return `${prefix}${padPublicSeq(1)}`;
    }
    const n = row.nextValue;
    await tx.idSequence.update({ where: { prefix }, data: { nextValue: n + 1 } });
    return `${prefix}${padPublicSeq(n)}`;
  }

  async create(dto: CreateStaffCustomerDto) {
    const phone = this.normalizeTrMobile(dto.phone);
    const email = dto.email.trim().toLowerCase();
    this.validateCreateCustomerPayload(dto);

    const phoneBusy = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true, customerProfile: { select: { id: true } } },
    });
    if (phoneBusy) {
      throw new ConflictException(
        phoneBusy.customerProfile
          ? 'Bu telefon numarası ile zaten müşteri kaydı bulunmaktadır'
          : 'Bu telefon numarası sistemde başka bir hesap türüyle kayıtlıdır',
      );
    }

    const emailDup = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (emailDup) {
      throw new ConflictException('Bu e-posta adresi zaten kayıtlı');
    }

    if (dto.tcKimlikNo) {
      const tcDup = await this.prisma.user.findFirst({
        where: { tcKimlikNo: dto.tcKimlikNo },
        select: { id: true },
      });
      if (tcDup) {
        throw new ConflictException('Bu T.C. Kimlik numarası ile kayıtlı bir hesap bulunmaktadır');
      }
    }

    if (dto.taxNumber) {
      const taxDup = await this.prisma.customerProfile.findFirst({
        where: { taxNumber: dto.taxNumber },
        select: { id: true },
      });
      if (taxDup) {
        throw new ConflictException('Bu vergi numarası ile kayıtlı bir müşteri bulunmaktadır');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const publicId = await this.prisma.$transaction(async (tx) => {
      const pid = await this.allocateCustomerPublicId(tx, dto.customerType);
      const user = await tx.user.create({
        data: {
          phone,
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          status: UserStatus.ACTIVE,
          phoneVerifiedAt: new Date(),
          tcKimlikNo:
            dto.customerType === CustomerType.CORPORATE
              ? null
              : (dto.tcKimlikNo?.trim() ?? null) || null,
        },
      });

      const profile = await tx.customerProfile.create({
        data: {
          userId: user.id,
          type: dto.customerType,
          publicId: pid,
          companyName: dto.customerType === CustomerType.CORPORATE ? dto.companyName!.trim() : null,
          taxNumber:
            dto.customerType === CustomerType.INDIVIDUAL
              ? null
              : (dto.taxNumber?.trim() ?? null) || null,
        },
      });

      await recordCustomerConsents(tx, profile.id, {
        registrationTermsGranted: true,
        marketingOptIn: false,
        source: 'staff_create',
      });

      return pid;
    });

    return this.getByPublicId(publicId);
  }

  private displayName(row: CustomerListRow): string {
    if (row.type === CustomerType.CORPORATE) {
      const co = row.companyName?.trim();
      if (co) return co;
    }
    const n = personName(row.user.firstName, row.user.lastName);
    return n || row.publicId;
  }

  private serializeListItem(r: CustomerListRow) {
    return {
      id: r.id,
      publicId: r.publicId,
      type: r.type,
      displayName: this.displayName(r),
      companyName: r.companyName?.trim() ?? null,
      userStatus: r.user.status,
      email: r.user.email,
      phone: r.user.phone,
      walletBalance: r.walletBalance.toString(),
      invoiceAccountEnabled: r.invoiceAccountEnabled,
      deliveryCount: r._count.deliveries,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async list(dto: ListStaffCustomersDto) {
    const skip = dto.skip ?? 0;
    const take = dto.take ?? 50;
    const q = dto.q?.trim();

    const where: Prisma.CustomerProfileWhereInput = {};
    if (q) {
      where.OR = [
        { publicId: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { taxNumber: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.customerProfile.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: listInclude,
      }),
      this.prisma.customerProfile.count({ where }),
    ]);

    return { items: rows.map((r) => this.serializeListItem(r)), total, skip, take };
  }

  async getByPublicId(publicId: string) {
    const pid = publicId.trim();
    const row = await this.prisma.customerProfile.findUnique({
      where: { publicId: pid },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            phone: true,
            tcKimlikNo: true,
            phoneVerifiedAt: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        _count: { select: { deliveries: true, savedAddresses: true } },
      },
    });
    if (!row) throw new NotFoundException('Müşteri bulunamadı');

    const customerWhere = { customerId: row.id } as const;
    const deliveredWhere = { ...customerWhere, status: DeliveryStatus.DELIVERED } as const;
    const activeWhere = {
      ...customerWhere,
      status: { not: DeliveryStatus.CANCELLED },
    } as const;

    const [recentDeliveries, consentRows, deliveredAgg, activeAgg, statusGroups] =
      await Promise.all([
        this.prisma.delivery.findMany({
          where: customerWhere,
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalPrice: true,
            commissionAmount: true,
            createdAt: true,
          },
        }),
        this.prisma.customerConsent.findMany({
          where: { customerProfileId: row.id },
          orderBy: { recordedAt: 'desc' },
          select: { type: true, granted: true, recordedAt: true, source: true },
        }),
        this.prisma.delivery.aggregate({
          where: deliveredWhere,
          _sum: { totalPrice: true, commissionAmount: true, courierEarning: true },
          _count: { _all: true },
        }),
        this.prisma.delivery.aggregate({
          where: activeWhere,
          _sum: { totalPrice: true, commissionAmount: true },
          _count: { _all: true },
        }),
        this.prisma.delivery.groupBy({
          by: ['status'],
          where: customerWhere,
          _count: { _all: true },
        }),
      ]);

    const zero = new Prisma.Decimal(0);
    const gross = deliveredAgg._sum.totalPrice ?? zero;
    const commission = deliveredAgg._sum.commissionAmount ?? zero;
    const courierPaid = deliveredAgg._sum.courierEarning ?? zero;
    const deliveredForFinance = deliveredAgg._count._all;
    const avgOrderGross =
      deliveredForFinance > 0 ? gross.div(new Prisma.Decimal(deliveredForFinance)) : zero;

    const statusCount = (s: DeliveryStatus) =>
      statusGroups.find((g) => g.status === s)?._count._all ?? 0;
    const cancelledCount = statusCount(DeliveryStatus.CANCELLED);
    const openCount = Math.max(0, row._count.deliveries - deliveredForFinance - cancelledCount);
    const activeOrderCount = activeAgg._count._all;
    const activeGross = activeAgg._sum.totalPrice ?? zero;
    const activeCommission = activeAgg._sum.commissionAmount ?? zero;

    return {
      id: row.id,
      publicId: row.publicId,
      type: row.type,
      displayName: this.displayName(row),
      companyName: row.companyName?.trim() ?? null,
      taxNumber: row.taxNumber?.trim() ?? null,
      taxOffice: row.taxOffice?.trim() ?? null,
      billingAddress: row.billingAddress?.trim() ?? null,
      userStatus: row.user.status,
      email: row.user.email,
      phone: row.user.phone,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      tcKimlikNo: row.user.tcKimlikNo?.trim() ?? null,
      phoneVerifiedAt: row.user.phoneVerifiedAt?.toISOString() ?? null,
      lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
      memberSince: row.user.createdAt.toISOString(),
      walletBalance: row.walletBalance.toString(),
      invoiceAccountEnabled: row.invoiceAccountEnabled,
      deliveryCount: row._count.deliveries,
      savedAddressCount: row._count.savedAddresses,
      createdAt: row.createdAt.toISOString(),
      finance: {
        deliveredCount: deliveredForFinance,
        grossRevenue: gross.toString(),
        platformProfit: commission.toString(),
        courierEarnings: courierPaid.toString(),
        avgOrderGross: avgOrderGross.toString(),
        openCount,
        cancelledCount,
        activeOrderCount,
        activeGross: activeGross.toString(),
        activeCommission: activeCommission.toString(),
      },
      consents: latestConsentsByType(consentRows),
      recentDeliveries: recentDeliveries.map((d) => ({
        id: d.id,
        orderNumber: d.orderNumber,
        status: d.status,
        totalPrice: d.totalPrice.toString(),
        commissionAmount: d.commissionAmount.toString(),
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async setUserStatus(publicId: string, dto: SetCourierUserStatusDto) {
    const pid = publicId.trim();
    const profile = await this.prisma.customerProfile.findUnique({
      where: { publicId: pid },
      select: { id: true, userId: true },
    });
    if (!profile) throw new NotFoundException('Müşteri bulunamadı');

    const user = await this.prisma.user.findUnique({
      where: { id: profile.userId },
      select: { status: true },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    if (dto.status === UserStatus.PASSIVE && user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Yalnızca aktif hesap pasife alınabilir');
    }
    if (dto.status === UserStatus.ACTIVE && user.status !== UserStatus.PASSIVE) {
      throw new BadRequestException('Yalnızca pasif hesap aktifleştirilebilir');
    }

    if (dto.status === UserStatus.PASSIVE) {
      const openOrders = await this.prisma.delivery.count({
        where: {
          customerId: profile.id,
          status: { notIn: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED] },
        },
      });
      if (openOrders > 0) {
        throw new BadRequestException('Devam eden sipariş varken müşteri pasife alınamaz');
      }
    }

    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { status: dto.status as UserStatus },
    });

    return this.getByPublicId(pid);
  }

  async updateProfile(publicId: string, dto: UpdateStaffCustomerDto) {
    const pid = publicId.trim();
    const profile = await this.prisma.customerProfile.findUnique({
      where: { publicId: pid },
      select: { id: true, type: true },
    });
    if (!profile) throw new NotFoundException('Müşteri bulunamadı');

    const data: Prisma.CustomerProfileUpdateInput = {};
    if (dto.invoiceAccountEnabled !== undefined) {
      data.invoiceAccountEnabled = dto.invoiceAccountEnabled;
    }
    if (dto.companyName !== undefined || dto.taxNumber !== undefined) {
      if (profile.type !== CustomerType.CORPORATE) {
        throw new BadRequestException('Şirket bilgileri yalnızca kurumsal müşterilerde güncellenir');
      }
    }
    if (dto.companyName !== undefined) {
      const v = dto.companyName.trim();
      data.companyName = v === '' ? null : v;
    }
    if (dto.taxNumber !== undefined) {
      const v = dto.taxNumber.trim();
      data.taxNumber = v === '' ? null : v;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Güncellenecek alan yok');
    }

    await this.prisma.customerProfile.update({
      where: { id: profile.id },
      data,
    });

    return this.getByPublicId(pid);
  }

  async adjustWallet(publicId: string, dto: AdjustCustomerWalletDto) {
    const pid = publicId.trim();
    let delta: Prisma.Decimal;
    try {
      delta = new Prisma.Decimal(dto.amount.trim());
    } catch {
      throw new BadRequestException('Geçersiz tutar');
    }
    if (delta.isNaN() || !delta.isFinite()) {
      throw new BadRequestException('Geçersiz tutar');
    }
    if (delta.equals(0)) {
      throw new BadRequestException('Tutar sıfır olamaz');
    }

    const reason = dto.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestException('Açıklama en az 3 karakter olmalı');
    }

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.customerProfile.findUnique({
        where: { publicId: pid },
        select: { id: true, walletBalance: true },
      });
      if (!row) throw new NotFoundException('Müşteri bulunamadı');

      const current = new Prisma.Decimal(row.walletBalance.toString());
      const next = current.plus(delta);
      if (next.lessThan(0)) {
        throw new BadRequestException('Bakiye negatif olamaz');
      }

      await tx.customerProfile.update({
        where: { id: row.id },
        data: { walletBalance: next },
      });
      await tx.balanceHistory.create({
        data: {
          customerProfileId: row.id,
          amount: delta,
          reason,
          refType: 'STAFF_WALLET_ADJUST',
        },
      });
    });

    return this.getByPublicId(pid);
  }

  async setPassword(publicId: string, password: string) {
    const pid = publicId.trim();
    const profile = await this.prisma.customerProfile.findUnique({
      where: { publicId: pid },
      select: { userId: true },
    });
    if (!profile) throw new NotFoundException('Müşteri bulunamadı');

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { passwordHash },
    });

    return this.getByPublicId(pid);
  }
}
