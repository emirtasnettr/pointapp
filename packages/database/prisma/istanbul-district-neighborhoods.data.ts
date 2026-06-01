/**
 * İstanbul ilçe → mahalle listesi.
 * Kaynak: İBB Açık Veri — Muhtarlık Adres Bilgileri (GeoJSON), işlenmiş çıktı:
 * `prisma/data/istanbul-mahalleler-by-ilce.json`
 *
 * Yenileme:
 * 1. GeoJSON indir: https://data.ibb.gov.tr/dataset/c310cde9-92b1-4c51-9575-d71b1dc7ac43/resource/71f75529-7fae-4a85-b05f-664c62eda422/download/muhtarlik_lokasyon.geojson
 *    → `prisma/data/muhtarlik_lokasyon.geojson`
 * 2. `npm run geo:build-mahalle` (packages/database)
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function resolveMahalleJsonPath(): string {
  const candidates = [
    join(process.cwd(), 'prisma', 'data', 'istanbul-mahalleler-by-ilce.json'),
    join(process.cwd(), 'packages', 'database', 'prisma', 'data', 'istanbul-mahalleler-by-ilce.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `istanbul-mahalleler-by-ilce.json bulunamadı. Önce \`npm run geo:build-mahalle\` çalıştırın. Denenen: ${candidates.join(' | ')}`,
  );
}

let cache: Record<string, string[]> | null = null;

function getMahalleMap(): Record<string, string[]> {
  if (!cache) {
    cache = JSON.parse(readFileSync(resolveMahalleJsonPath(), 'utf8')) as Record<string, string[]>;
  }
  return cache;
}

export function mahallelerForDistrict(districtName: string): string[] {
  const list = getMahalleMap()[districtName];
  if (!list?.length) {
    throw new Error(
      `Mahalle verisi yok: "${districtName}". Önce \`npm run geo:build-mahalle\` ile prisma/data/istanbul-mahalleler-by-ilce.json üretin.`,
    );
  }
  return [...new Set(list)];
}
