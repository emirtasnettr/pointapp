import { DeliveryStatus, Prisma, WalletLedgerType } from '@prisma/client';

const ACCRUING_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.COURIER_ASSIGNED,
  DeliveryStatus.COURIER_EN_ROUTE,
  DeliveryStatus.PACKAGE_PICKED_UP,
];

export function isAccruingDeliveryStatus(status: DeliveryStatus): boolean {
  return ACCRUING_STATUSES.includes(status);
}

async function getOrCreateWallet(tx: Prisma.TransactionClient, courierProfileId: string) {
  const existing = await tx.courierWallet.findUnique({ where: { courierId: courierProfileId } });
  if (existing) return existing;
  return tx.courierWallet.create({
    data: { courierId: courierProfileId },
  });
}

/** Bekleyen = üzerindeki aktif teslimatların toplam kurye kazancı. */
export async function syncCourierPendingFromActiveDeliveries(
  tx: Prisma.TransactionClient,
  courierProfileId: string,
) {
  const agg = await tx.delivery.aggregate({
    where: {
      courierId: courierProfileId,
      status: { in: ACCRUING_STATUSES },
    },
    _sum: { courierEarning: true },
  });
  const expected = agg._sum.courierEarning ?? new Prisma.Decimal(0);
  const wallet = await getOrCreateWallet(tx, courierProfileId);
  await tx.courierWallet.update({
    where: { id: wallet.id },
    data: { pending: expected },
  });
}

/** Teslim tamamlanınca kazanç çekilebilir bakiyeye aktarılır. */
export async function creditCourierDeliveryEarning(
  tx: Prisma.TransactionClient,
  courierProfileId: string,
  deliveryId: string,
  orderNumber: number,
  amount: Prisma.Decimal,
) {
  if (amount.lte(0)) return;
  const wallet = await getOrCreateWallet(tx, courierProfileId);
  await tx.courierWallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: amount } },
  });
  await tx.walletLedgerEntry.create({
    data: {
      walletId: wallet.id,
      amount,
      type: WalletLedgerType.DELIVERY_EARNING,
      refType: 'delivery',
      refId: deliveryId,
      meta: { orderNumber } as Prisma.InputJsonValue,
    },
  });
}
