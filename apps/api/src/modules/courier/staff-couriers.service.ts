import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourierOnboardingStatus,
  CourierType,
  DeliveryStatus,
  Prisma,
  PublicIdPrefix,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { latestCourierConsentsByType } from '../auth/courier-consent.util';
import { formatTurkishPlateDisplay } from '../../common/turkish-plate';
import { CreateStaffCourierDto } from './dto/create-staff-courier.dto';
import { ListStaffCouriersDto } from './dto/list-staff-couriers.dto';
import { SetCourierUserStatusDto } from './dto/set-courier-user-status.dto';

function personName(first?: string | null, last?: string | null) {
  return [first, last]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean)
    .join(' ')
    .trim();
}

const listInclude = {
  user: { select: { email: true, firstName: true, lastName: true, status: true, phone: true } },
  wallet: { select: { balance: true, pending: true, currency: true } },
  _count: { select: { deliveries: { where: { status: DeliveryStatus.DELIVERED } } } },
} as const;

type CourierListRow = Prisma.CourierProfileGetPayload<{ include: typeof listInclude }>;

function padPublicSeq(n: number) {
  return String(n).padStart(6, '0');
}

@Injectable()
export class StaffCouriersService {
  constructor(private readonly prisma: PrismaService) {}

  private async allocateNextCourierPublicId(
    tx: Prisma.TransactionClient,
    type: CourierType,
  ): Promise<string> {
    const prefix = type === CourierType.MERCHANT ? PublicIdPrefix.EK : PublicIdPrefix.BK;
    const row = await tx.idSequence.findUnique({ where: { prefix } });
    if (!row) {
      await tx.idSequence.create({ data: { prefix, nextValue: 2 } });
      return `${prefix}${padPublicSeq(1)}`;
    }
    const n = row.nextValue;
    await tx.idSequence.update({ where: { prefix }, data: { nextValue: n + 1 } });
    return `${prefix}${padPublicSeq(n)}`;
  }

  async create(dto: CreateStaffCourierDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    const dup = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictException('Bu e-posta veya telefon başka bir hesapta kayıtlı');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const publicId = await this.prisma.$transaction(async (tx) => {
      const pid = await this.allocateNextCourierPublicId(tx, dto.type);
      const user = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          status: UserStatus.ACTIVE,
          phoneVerifiedAt: new Date(),
        },
      });
      const profile = await tx.courierProfile.create({
        data: {
          userId: user.id,
          type: dto.type,
          publicId: pid,
          vehicleType: dto.vehicleType,
          onboardingStatus: CourierOnboardingStatus.APPROVED,
        },
      });
      await tx.courierWallet.create({
        data: { courierId: profile.id },
      });
      return profile.publicId;
    });

    return this.getByPublicId(publicId);
  }

  async setUserStatus(publicId: string, dto: SetCourierUserStatusDto) {
    const pid = publicId.trim();
    const profile = await this.prisma.courierProfile.findUnique({
      where: { publicId: pid },
      select: { id: true, userId: true },
    });
    if (!profile) throw new NotFoundException('Kurye bulunamadı');

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
      const activeJobs = await this.prisma.delivery.count({
        where: {
          courierId: profile.id,
          status: {
            in: [
              DeliveryStatus.COURIER_ASSIGNED,
              DeliveryStatus.COURIER_EN_ROUTE,
              DeliveryStatus.PACKAGE_PICKED_UP,
            ],
          },
        },
      });
      if (activeJobs > 0) {
        throw new BadRequestException('Üzerinde devam eden teslimat varken hesap pasife alınamaz');
      }
    }

    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { status: dto.status as UserStatus },
    });

    return this.getByPublicId(pid);
  }

  async setPassword(publicId: string, password: string) {
    const pid = publicId.trim();
    const profile = await this.prisma.courierProfile.findUnique({
      where: { publicId: pid },
      select: { userId: true },
    });
    if (!profile) throw new NotFoundException('Kurye bulunamadı');

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { passwordHash },
    });

    return this.getByPublicId(pid);
  }

  private serializeListItem(r: CourierListRow) {
    const displayName = personName(r.user.firstName, r.user.lastName) || r.publicId;
    return {
      id: r.id,
      publicId: r.publicId,
      type: r.type,
      vehicleType: r.vehicleType,
      plate: r.plate ? formatTurkishPlateDisplay(r.plate) : null,
      displayName,
      userStatus: r.user.status,
      email: r.user.email,
      phone: r.user.phone,
      walletBalance: r.wallet ? r.wallet.balance.toString() : null,
      walletPending: r.wallet ? r.wallet.pending.toString() : null,
      currency: r.wallet?.currency ?? 'TRY',
      deliveredCount: r._count.deliveries,
      isOnline: r.isOnline,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async list(dto: ListStaffCouriersDto) {
    const skip = dto.skip ?? 0;
    const take = dto.take ?? 50;
    const q = dto.q?.trim();

    const where: Prisma.CourierProfileWhereInput = {};
    if (q) {
      where.OR = [
        { publicId: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.courierProfile.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: listInclude,
      }),
      this.prisma.courierProfile.count({ where }),
    ]);

    return { items: rows.map((r) => this.serializeListItem(r)), total, skip, take };
  }

  async getByPublicId(publicId: string) {
    const pid = publicId.trim();
    const row = await this.prisma.courierProfile.findUnique({
      where: { publicId: pid },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, status: true, phone: true } },
        wallet: { select: { id: true, balance: true, pending: true, currency: true } },
        _count: { select: { deliveries: { where: { status: DeliveryStatus.DELIVERED } } } },
      },
    });
    if (!row) throw new NotFoundException('Kurye bulunamadı');

    const [recentDeliveries, consentRows] = await Promise.all([
      this.prisma.delivery.findMany({
        where: { courierId: row.id },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalPrice: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.courierConsent.findMany({
        where: { courierProfileId: row.id },
        orderBy: { recordedAt: 'desc' },
        select: { type: true, granted: true, recordedAt: true, source: true },
      }),
    ]);

    const displayName = personName(row.user.firstName, row.user.lastName) || row.publicId;
    const consents = latestCourierConsentsByType(consentRows);

    return {
      id: row.id,
      publicId: row.publicId,
      type: row.type,
      vehicleType: row.vehicleType,
      plate: row.plate ? formatTurkishPlateDisplay(row.plate) : null,
      iban: row.iban,
      displayName,
      user: {
        email: row.user.email,
        phone: row.user.phone,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        status: row.user.status,
      },
      wallet: row.wallet
        ? {
            balance: row.wallet.balance.toString(),
            pending: row.wallet.pending.toString(),
            currency: row.wallet.currency,
          }
        : null,
      deliveredCount: row._count.deliveries,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      consents: {
        registrationTerms: consents.registrationTerms,
        marketingNotifications: consents.marketingNotifications,
      },
      recentDeliveries: recentDeliveries.map((d) => ({
        id: d.id,
        orderNumber: d.orderNumber,
        status: d.status,
        totalPrice: d.totalPrice.toString(),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    };
  }
}
