import { Injectable } from '@nestjs/common';
import { DeliveryStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PAID_STATUSES: PaymentStatus[] = [PaymentStatus.CAPTURED, PaymentStatus.AUTHORIZED];

function utcDayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

type CustomerForDisplay = {
  publicId: string;
  companyName: string | null;
  user: { email: string | null; firstName: string | null; lastName: string | null };
};

function customerDisplayName(c: CustomerForDisplay): string {
  const co = c.companyName?.trim();
  if (co) return co;
  const n = `${c.user.firstName ?? ''} ${c.user.lastName ?? ''}`.trim();
  if (n) return n;
  if (c.user.email) return c.user.email;
  return c.publicId;
}

@Injectable()
export class StaffFinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const start = utcDayStart();

    const pendingWhere = {
      paymentStatus: PaymentStatus.PENDING,
      status: { not: DeliveryStatus.CANCELLED },
    } as const;

    const [todayPaidAgg, pendingCount, pendingSumAgg, recentRows] = await Promise.all([
      this.prisma.delivery.aggregate({
        where: {
          paymentStatus: { in: PAID_STATUSES },
          createdAt: { gte: start },
        },
        _sum: { totalPrice: true, commissionAmount: true },
      }),
      this.prisma.delivery.count({ where: pendingWhere }),
      this.prisma.delivery.aggregate({
        where: pendingWhere,
        _sum: { totalPrice: true },
      }),
      this.prisma.delivery.findMany({
        take: 75,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalPrice: true,
          commissionAmount: true,
          paymentMethod: true,
          paymentStatus: true,
          createdAt: true,
          customer: {
            select: {
              publicId: true,
              companyName: true,
              user: { select: { email: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    const zero = new Prisma.Decimal(0);
    const todayCollected = todayPaidAgg._sum.totalPrice ?? zero;
    const todayCommission = todayPaidAgg._sum.commissionAmount ?? zero;
    const pendingAmount = pendingSumAgg._sum.totalPrice ?? zero;

    return {
      summary: {
        /** UTC günü; tahsil/yetkili ödemeler, sipariş oluşturulma `createdAt` bugün (UTC) */
        todayCollectedGross: todayCollected.toString(),
        todayCommission: todayCommission.toString(),
        pendingPaymentCount: pendingCount,
        pendingPaymentAmountGross: pendingAmount.toString(),
      },
      recentDeliveries: recentRows.map((r) => ({
        id: r.id,
        orderNumber: r.orderNumber,
        status: r.status,
        totalPrice: r.totalPrice.toString(),
        commissionAmount: r.commissionAmount.toString(),
        paymentMethod: r.paymentMethod,
        paymentStatus: r.paymentStatus,
        createdAt: r.createdAt.toISOString(),
        customer: {
          publicId: r.customer.publicId,
          displayName: customerDisplayName(r.customer),
        },
      })),
    };
  }
}
