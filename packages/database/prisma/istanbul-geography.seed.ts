import type { Prisma } from '@prisma/client';
import { mahallelerForDistrict } from './istanbul-district-neighborhoods.data';

/** Tek bölge — yalnızca İstanbul müşteri/kurye operasyonu */
export const ISTANBUL_REGION_CODE = 'TR-34';

const ISTANBUL_DISTRICTS: readonly string[] = [
  'Adalar',
  'Arnavutköy',
  'Ataşehir',
  'Avcılar',
  'Bağcılar',
  'Bahçelievler',
  'Bakırköy',
  'Başakşehir',
  'Bayrampaşa',
  'Beşiktaş',
  'Beykoz',
  'Beylikdüzü',
  'Beyoğlu',
  'Büyükçekmece',
  'Çatalca',
  'Çekmeköy',
  'Esenler',
  'Esenyurt',
  'Eyüpsultan',
  'Fatih',
  'Gaziosmanpaşa',
  'Güngören',
  'Kadıköy',
  'Kağıthane',
  'Kartal',
  'Küçükçekmece',
  'Maltepe',
  'Pendik',
  'Sancaktepe',
  'Sarıyer',
  'Silivri',
  'Sultanbeyli',
  'Sultangazi',
  'Şile',
  'Şişli',
  'Tuzla',
  'Ümraniye',
  'Üsküdar',
  'Zeytinburnu',
] as const;

export type IstanbulGeoIndex = {
  regionId: string;
  /** `İlçe adı|Mahalle adı` → neighborhood id */
  neighborhoodKeyToId: Map<string, string>;
};

/** TR-34 coğrafya bölgesi — fiyat matrisinden önce çağrılmalıdır. */
export async function ensureIstanbulMetroRegion(tx: Prisma.TransactionClient): Promise<{ regionId: string }> {
  const region = await tx.region.upsert({
    where: { code: ISTANBUL_REGION_CODE },
    create: { code: ISTANBUL_REGION_CODE, name: 'İstanbul', sortOrder: 0 },
    update: { name: 'İstanbul', sortOrder: 0 },
    select: { id: true },
  });
  return { regionId: region.id };
}

/**
 * İstanbul ilçe ve mahalle ağacını upsert eder (idempotent).
 * `ensureIstanbulMetroRegion` ve `ensureIstanbulPriceZonesAndMatrix` önceden çalışmış olmalı (IST-PZ satırları).
 */
export async function ensureIstanbulGeography(tx: Prisma.TransactionClient): Promise<IstanbulGeoIndex> {
  for (const dName of ISTANBUL_DISTRICTS) {
    mahallelerForDistrict(dName);
  }

  const region = await tx.region.findUnique({
    where: { code: ISTANBUL_REGION_CODE },
    select: { id: true },
  });
  if (!region) {
    throw new Error('TR-34 bölgesi yok — önce ensureIstanbulMetroRegion çalıştırın.');
  }

  const defaultPricing = await tx.region.findFirst({
    where: { code: { startsWith: 'IST-PZ' } },
    orderBy: { code: 'asc' },
    select: { id: true },
  });
  if (!defaultPricing) {
    throw new Error('Fiyat bölgesi (IST-PZ…) yok — önce ensureIstanbulPriceZonesAndMatrix çalıştırın.');
  }

  const neighborhoodKeyToId = new Map<string, string>();

  for (const dName of ISTANBUL_DISTRICTS) {
    const d = await tx.district.upsert({
      where: { regionId_name: { regionId: region.id, name: dName } },
      create: { regionId: region.id, name: dName, pricingRegionId: defaultPricing.id },
      update: {},
    });
    const nNames = mahallelerForDistrict(dName);
    for (const nName of nNames) {
      const n = await tx.neighborhood.upsert({
        where: { districtId_name: { districtId: d.id, name: nName } },
        create: { districtId: d.id, name: nName },
        update: {},
      });
      neighborhoodKeyToId.set(`${dName}|${nName}`, n.id);
    }
    /** Eski seed / elle veri: ilçede artık kanonik listede olmayan mahalle satırlarını kaldır (adresi olanlara dokunma). */
    await tx.neighborhood.deleteMany({
      where: {
        districtId: d.id,
        name: { notIn: [...nNames] },
        savedAddresses: { none: {} },
      },
    });
  }

  return { regionId: region.id, neighborhoodKeyToId };
}

export function neighborhoodIdFromIndex(
  index: IstanbulGeoIndex,
  districtName: string,
  neighborhoodName: string,
): string | undefined {
  return index.neighborhoodKeyToId.get(`${districtName}|${neighborhoodName}`);
}
