import { Injectable, NotFoundException } from '@nestjs/common';
import { CourierOnboardingStatus, DeliveryStatus, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { syncCourierPendingFromActiveDeliveries } from '../deliveries/courier-wallet.util';
import { DeliveriesService, deliveryInclude } from '../deliveries/deliveries.service';
import {
  courierHistorySince,
  type CourierHistoryPeriod,
  parseCourierHistoryPeriod,
} from './courier-history-period';

const ACTIVE_FOR_COURIER: DeliveryStatus[] = [
  DeliveryStatus.COURIER_ASSIGNED,
  DeliveryStatus.COURIER_EN_ROUTE,
  DeliveryStatus.PACKAGE_PICKED_UP,
];

/** Dashboard haritası: yalnızca kuryede aktif paketler (atanmış / yolda / alındı) */
const MAP_PACKAGE_STATUSES: DeliveryStatus[] = [...ACTIVE_FOR_COURIER];

const courierWalletInclude = { wallet: true } as const;
type CourierWithWallet = Prisma.CourierProfileGetPayload<{ include: typeof courierWalletInclude }>;

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveries: DeliveriesService,
  ) {}

  async dashboard() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const [byStatus, todayCount, todaySum, onlineCourierCount, activeCouriers, recentRows, densityRows, courierSnapRows] =
      await Promise.all([
      this.prisma.delivery.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.delivery.count({ where: { createdAt: { gte: start } } }),
      this.prisma.delivery.aggregate({
        where: { createdAt: { gte: start } },
        _sum: { totalPrice: true, commissionAmount: true },
      }),
      this.prisma.courierProfile.count({
        where: {
          isOnline: true,
          onboardingStatus: CourierOnboardingStatus.APPROVED,
          user: { status: UserStatus.ACTIVE },
        },
      }),
      this.prisma.delivery.findMany({
        where: { status: { in: ACTIVE_FOR_COURIER }, courierId: { not: null } },
        distinct: ['courierId'],
        select: { courierId: true },
      }),
      this.prisma.delivery.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: deliveryInclude,
      }),
      this.prisma.delivery.findMany({
        where: { status: { in: MAP_PACKAGE_STATUSES } },
        take: 200,
        orderBy: { updatedAt: 'desc' },
        select: { orderNumber: true, status: true, dropoffAddress: true },
      }),
      this.prisma.courierLocationSnapshot.findMany({
        where: {
          delivery: { status: { in: ACTIVE_FOR_COURIER } },
        },
        orderBy: { recordedAt: 'desc' },
        take: 400,
        select: {
          lat: true,
          lng: true,
          courierId: true,
          courier: { select: { publicId: true } },
          delivery: { select: { orderNumber: true } },
        },
      }),
    ]);

    const gross = todaySum._sum.totalPrice ?? new Prisma.Decimal(0);
    const commission = todaySum._sum.commissionAmount ?? new Prisma.Decimal(0);

    const dropoffPoints = densityRows
      .map((row) => {
        const a = row.dropoffAddress as Record<string, unknown> | null;
        if (!a || typeof a !== 'object') return null;
        const lat = typeof a.lat === 'number' ? a.lat : Number(a.lat);
        const lng = typeof a.lng === 'number' ? a.lng : Number(a.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }
        const label =
          typeof a.label === 'string' ? a.label : typeof a.line1 === 'string' ? a.line1 : undefined;
        return {
          orderNumber: row.orderNumber,
          status: row.status,
          lat,
          lng,
          label,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p != null);

    const seenCourier = new Set<string>();
    const courierMapPoints: { publicId: string; lat: number; lng: number; orderNumber: number }[] = [];
    for (const row of courierSnapRows) {
      if (seenCourier.has(row.courierId)) continue;
      seenCourier.add(row.courierId);
      if (Number.isFinite(row.lat) && Number.isFinite(row.lng)) {
        courierMapPoints.push({
          publicId: row.courier.publicId,
          lat: row.lat,
          lng: row.lng,
          orderNumber: row.delivery.orderNumber,
        });
      }
    }

    return {
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      today: {
        deliveryCount: todayCount,
        gross: gross.toString(),
        commission: commission.toString(),
      },
      onlineCourierCount,
      activeCourierCount: activeCouriers.length,
      recentDeliveries: recentRows.map((d) => this.deliveries.serialize(d)),
      dropoffPoints,
      courierMapPoints,
    };
  }

  async courierDemo(publicId: string) {
    const resolved = await this.resolveCourierForDemo(publicId);
    if (!resolved) {
      throw new NotFoundException(
        'Veritabanında hiç kurye profili yok. `npm run db:seed` çalıştırın ve API ile aynı DATABASE_URL kullandığınızdan emin olun.',
      );
    }
    return this.buildCourierPayload(resolved.courier, resolved.requestedPublicId);
  }

  async courierMeForUser(userId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId },
      include: courierWalletInclude,
    });
    if (!courier) {
      throw new NotFoundException('Kurye profili bulunamadı');
    }
    return this.buildCourierPayload(courier, courier.publicId);
  }

  async courierHistoryForUser(userId: string, periodRaw?: string) {
    const period: CourierHistoryPeriod = parseCourierHistoryPeriod(periodRaw);
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId },
      select: { id: true, publicId: true },
    });
    if (!courier) {
      throw new NotFoundException('Kurye profili bulunamadı');
    }

    const since = courierHistorySince(period);
    const rows = await this.prisma.delivery.findMany({
      where: {
        courierId: courier.id,
        status: DeliveryStatus.DELIVERED,
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
      include: deliveryInclude,
    });

    return {
      period,
      since: since.toISOString(),
      total: rows.length,
      items: rows.map((d) => this.deliveries.serializeForCourier(d)),
    };
  }

  private async buildCourierPayload(courier: CourierWithWallet, requestedPublicId: string) {
    await this.prisma.$transaction((tx) =>
      syncCourierPendingFromActiveDeliveries(tx, courier.id),
    );
    const walletRow = await this.prisma.courierWallet.findUnique({
      where: { courierId: courier.id },
    });
    const walletId = walletRow?.id;

    const [
      poolCount,
      myActiveRows,
      deliveredAgg,
      recentDeliveredRows,
      ledgerRows,
    ] = await Promise.all([
      this.prisma.delivery.count({ where: { status: DeliveryStatus.POOL } }),
      this.prisma.delivery.findMany({
        where: {
          courierId: courier.id,
          status: { in: ACTIVE_FOR_COURIER },
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        include: deliveryInclude,
      }),
      this.prisma.delivery.aggregate({
        where: { courierId: courier.id, status: DeliveryStatus.DELIVERED },
        _count: { _all: true },
        _sum: { courierEarning: true },
      }),
      this.prisma.delivery.findMany({
        where: { courierId: courier.id, status: DeliveryStatus.DELIVERED },
        orderBy: { updatedAt: 'desc' },
        take: 25,
        include: deliveryInclude,
      }),
      walletId
        ? this.prisma.walletLedgerEntry.findMany({
            where: { walletId },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        : Promise.resolve([]),
    ]);

    const earningSum = deliveredAgg._sum.courierEarning ?? new Prisma.Decimal(0);

    return {
      requestedPublicId,
      courierPublicId: courier.publicId,
      poolCount,
      wallet: walletRow
        ? {
            balance: walletRow.balance.toString(),
            pending: walletRow.pending.toString(),
            currency: walletRow.currency,
          }
        : null,
      myActive: myActiveRows.map((d) => this.deliveries.serializeForCourier(d)),
      delivered: {
        count: deliveredAgg._count._all,
        totalCourierEarning: earningSum.toString(),
      },
      recentDelivered: recentDeliveredRows.map((d) => this.deliveries.serializeForCourier(d)),
      ledger: ledgerRows.map((e) => ({
        id: e.id,
        amount: e.amount.toString(),
        type: e.type,
        refType: e.refType,
        refId: e.refId,
        meta: e.meta,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  /** Demo: tam publicId yoksa BK* veya ilk kurye ile yedekle (mobil / farklı DB senaryoları). */
  private async resolveCourierForDemo(
    publicId: string,
  ): Promise<{ courier: CourierWithWallet; requestedPublicId: string } | null> {
    const want = (publicId?.trim() || 'BK000001').trim() || 'BK000001';

    const courierUnique = await this.prisma.courierProfile.findUnique({
      where: { publicId: want },
      include: courierWalletInclude,
    });
    if (courierUnique) {
      return { courier: courierUnique, requestedPublicId: want };
    }

    const byBk = await this.prisma.courierProfile.findFirst({
      where: { publicId: { startsWith: 'BK' } },
      orderBy: { createdAt: 'asc' },
      include: courierWalletInclude,
    });
    if (byBk) {
      return { courier: byBk, requestedPublicId: want };
    }

    const anyCourier = await this.prisma.courierProfile.findFirst({
      orderBy: { createdAt: 'asc' },
      include: courierWalletInclude,
    });
    if (anyCourier) {
      return { courier: anyCourier, requestedPublicId: want };
    }

    return null;
  }
}
