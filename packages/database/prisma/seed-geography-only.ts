/**
 * İstanbul coğrafya (ilçe/mahalle) + 8×8 fiyat matrisi — idempotent.
 * Demo kullanıcı/sipariş oluşturmaz; mevcut teslimatları silmez.
 *
 * Lokal: npm run seed:geography -w @point/database
 * VPS:   ./deploy/scripts/prod-seed-geography.sh
 */
import { PrismaClient } from '@prisma/client';
import {
  ensureIstanbulGeography,
  ensureIstanbulMetroRegion,
} from './istanbul-geography.seed';
import { ensureIstanbulPriceZonesAndMatrix } from './istanbul-price-matrix.seed';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    const metro = await ensureIstanbulMetroRegion(tx);
    await ensureIstanbulPriceZonesAndMatrix(tx, metro.regionId);
    const geo = await ensureIstanbulGeography(tx);
    const districtCount = await tx.district.count({
      where: { region: { code: 'TR-34' } },
    });
    const neighborhoodCount = await tx.neighborhood.count({
      where: { district: { region: { code: 'TR-34' } } },
    });
    const matrixCount = await tx.regionPriceMatrix.count({
      where: { effectiveTo: null },
    });
    console.log('İstanbul coğrafya + fiyat matrisi yüklendi.');
    console.log(`  İlçe: ${districtCount} | Mahalle: ${neighborhoodCount}`);
    console.log(`  Aktif matris satırı: ${matrixCount}`);
    console.log(`  Mahalle indeks anahtarı: ${geo.neighborhoodKeyToId.size}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
