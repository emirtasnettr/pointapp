import { Prisma } from '@prisma/client';

/** Coğrafya (TR-34) ile karışmaması için ayrı kodlar — yalnızca fiyat matrisi. */
const PRICING_ZONE_COUNT = 8;

function zoneCode(index: number) {
  return `IST-PZ${String(index + 1).padStart(2, '0')}`;
}

/**
 * İstanbul için 8 fiyat bölgesi (Region) ve aralarında 8×8 aktif matris + TR-34→TR-34 tek satır.
 * Idempotent: bölge upsert; matris satırları ilgili id kümesi için silinip yeniden yazılır.
 */
export async function ensureIstanbulPriceZonesAndMatrix(
  tx: Prisma.TransactionClient,
  istanbulRegionId: string,
): Promise<void> {
  const zones: { id: string }[] = [];
  for (let i = 0; i < PRICING_ZONE_COUNT; i++) {
    const code = zoneCode(i);
    const z = await tx.region.upsert({
      where: { code },
      create: {
        code,
        name: `İstanbul fiyat bölgesi ${i + 1}`,
        sortOrder: 10 + i,
      },
      update: {
        name: `İstanbul fiyat bölgesi ${i + 1}`,
        sortOrder: 10 + i,
      },
      select: { id: true },
    });
    zones.push(z);
  }

  const zoneIds = zones.map((z) => z.id);

  await tx.regionPriceMatrix.deleteMany({
    where: {
      AND: [{ fromRegionId: { in: zoneIds } }, { toRegionId: { in: zoneIds } }],
    },
  });

  const effectiveFrom = new Date('2026-01-01T00:00:00.000Z');
  const matrixRows: Prisma.RegionPriceMatrixCreateManyInput[] = [];
  for (let i = 0; i < PRICING_ZONE_COUNT; i++) {
    for (let j = 0; j < PRICING_ZONE_COUNT; j++) {
      const dist = Math.abs(i - j);
      matrixRows.push({
        fromRegionId: zones[i].id,
        toRegionId: zones[j].id,
        baseMotor: new Prisma.Decimal(55 + dist * 8),
        baseCar: new Prisma.Decimal(85 + dist * 12),
        perKgMotor: new Prisma.Decimal('2.2'),
        perKgCar: new Prisma.Decimal('3.1'),
        nightMultiplier: new Prisma.Decimal('1.15'),
        surgeMultiplier: new Prisma.Decimal('1'),
        effectiveFrom,
        effectiveTo: null,
      });
    }
  }
  await tx.regionPriceMatrix.createMany({ data: matrixRows });

  await tx.regionPriceMatrix.deleteMany({
    where: {
      fromRegionId: istanbulRegionId,
      toRegionId: istanbulRegionId,
      effectiveTo: null,
    },
  });
  await tx.regionPriceMatrix.create({
    data: {
      fromRegionId: istanbulRegionId,
      toRegionId: istanbulRegionId,
      baseMotor: new Prisma.Decimal('89'),
      baseCar: new Prisma.Decimal('129'),
      perKgMotor: new Prisma.Decimal('2.5'),
      perKgCar: new Prisma.Decimal('3.5'),
      nightMultiplier: new Prisma.Decimal('1.2'),
      surgeMultiplier: new Prisma.Decimal('1'),
      effectiveFrom,
      effectiveTo: null,
    },
  });
}
