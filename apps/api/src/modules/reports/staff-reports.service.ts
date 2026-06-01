import { BadRequestException, Injectable } from '@nestjs/common';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListStaffReportsDto } from './dto/list-staff-reports.dto';

function utcDayStart(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 0, 0, 0, 0));
}

function utcDayEnd(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 23, 59, 59, 999));
}

function parseYmd(s: string | undefined): { y: number; m: number; d: number } | null {
  if (!s?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo - 1, d };
}

function courierDisplayName(c: {
  publicId: string;
  user: { firstName: string | null; lastName: string | null };
}): string {
  const n = `${c.user.firstName ?? ''} ${c.user.lastName ?? ''}`.trim();
  return n || c.publicId;
}

@Injectable()
export class StaffReportsService {
  constructor(private readonly prisma: PrismaService) {}

  overview(dto: ListStaffReportsDto) {
    const toParts = parseYmd(dto.to);
    const fromParts = parseYmd(dto.from);

    if (dto.to?.trim() && !toParts) {
      throw new BadRequestException('Geçersiz bitiş tarihi (YYYY-MM-DD)');
    }
    if (dto.from?.trim() && !fromParts) {
      throw new BadRequestException('Geçersiz başlangıç tarihi (YYYY-MM-DD)');
    }

    const today = new Date();
    const defaultTo = utcDayEnd(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const defaultFrom = utcDayStart(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 13);

    let rangeTo = toParts ? utcDayEnd(toParts.y, toParts.m, toParts.d) : defaultTo;
    let rangeFrom = fromParts ? utcDayStart(fromParts.y, fromParts.m, fromParts.d) : defaultFrom;

    if (fromParts && !toParts) {
      rangeTo = defaultTo;
    }
    if (toParts && !fromParts) {
      rangeFrom = utcDayStart(toParts.y, toParts.m, toParts.d);
      rangeFrom.setUTCDate(rangeFrom.getUTCDate() - 13);
    }

    if (rangeFrom.getTime() > rangeTo.getTime()) {
      throw new BadRequestException('Başlangıç tarihi bitişten sonra olamaz');
    }

    const maxSpanMs = 366 * 86400_000;
    if (rangeTo.getTime() - rangeFrom.getTime() > maxSpanMs) {
      throw new BadRequestException('En fazla 366 günlük aralık seçilebilir');
    }

    return this.buildOverview(rangeFrom, rangeTo);
  }

  private async buildOverview(from: Date, to: Date) {
    const whereRange = { createdAt: { gte: from, lte: to } } as const;

    const [
      byStatus,
      byPaymentStatus,
      totalCount,
      deliveredCount,
      cancelledCount,
      sums,
      dailyRows,
      courierGroups,
    ] = await Promise.all([
      this.prisma.delivery.groupBy({
        by: ['status'],
        where: whereRange,
        _count: { _all: true },
      }),
      this.prisma.delivery.groupBy({
        by: ['paymentStatus'],
        where: whereRange,
        _count: { _all: true },
      }),
      this.prisma.delivery.count({ where: whereRange }),
      this.prisma.delivery.count({
        where: { ...whereRange, status: DeliveryStatus.DELIVERED },
      }),
      this.prisma.delivery.count({
        where: { ...whereRange, status: DeliveryStatus.CANCELLED },
      }),
      this.prisma.delivery.aggregate({
        where: whereRange,
        _sum: { totalPrice: true, commissionAmount: true },
      }),
      this.prisma.$queryRaw<
        { day: string; count: number; gross: string; commission: string }[]
      >(Prisma.sql`
        SELECT
          to_char(("createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
          COUNT(*)::int AS count,
          COALESCE(SUM("totalPrice"), 0)::text AS gross,
          COALESCE(SUM("commissionAmount"), 0)::text AS commission
        FROM deliveries
        WHERE "createdAt" >= ${from}
          AND "createdAt" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      this.prisma.delivery.groupBy({
        by: ['courierId'],
        where: {
          ...whereRange,
          courierId: { not: null },
          status: DeliveryStatus.DELIVERED,
        },
        _count: { _all: true },
      }),
    ]);

    const gross = sums._sum.totalPrice ?? new Prisma.Decimal(0);
    const commission = sums._sum.commissionAmount ?? new Prisma.Decimal(0);
    const avg =
      totalCount > 0 ? gross.div(new Prisma.Decimal(totalCount)) : new Prisma.Decimal(0);

    const finished = deliveredCount + cancelledCount;
    const completionRatePct =
      finished > 0
        ? Math.round((1000 * deliveredCount) / finished) / 10
        : null;

    const sortedCouriers = courierGroups
      .filter((g) => g.courierId != null)
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 10);

    const courierIds = sortedCouriers.map((g) => g.courierId!);
    const courierRows =
      courierIds.length > 0
        ? await this.prisma.courierProfile.findMany({
            where: { id: { in: courierIds } },
            select: {
              id: true,
              publicId: true,
              user: { select: { firstName: true, lastName: true } },
            },
          })
        : [];

    const idToCourier = new Map(courierRows.map((c) => [c.id, c]));

    const topCouriers = sortedCouriers.map((g) => {
      const c = idToCourier.get(g.courierId!);
      return {
        courierId: g.courierId!,
        publicId: c?.publicId ?? g.courierId!,
        displayName: c ? courierDisplayName(c) : g.courierId!,
        deliveredCount: g._count._all,
      };
    });

    const openCount = totalCount - deliveredCount - cancelledCount;

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        deliveryCount: totalCount,
        deliveredCount,
        cancelledCount,
        openCount,
        gross: gross.toString(),
        commission: commission.toString(),
        avgOrderGross: avg.toString(),
        completionRatePercent: completionRatePct,
      },
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byPaymentStatus: byPaymentStatus.map((r) => ({
        paymentStatus: r.paymentStatus,
        count: r._count._all,
      })),
      daily: dailyRows.map((r) => ({
        day: r.day,
        count: r.count,
        gross: r.gross,
        commission: r.commission,
      })),
      topCouriers,
    };
  }
}
