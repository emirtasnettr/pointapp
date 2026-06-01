/**
 * İBB Muhtarlık Adres Bilgileri GeoJSON'undan ilçe → mahalle listesi üretir.
 * Kaynak: https://data.ibb.gov.tr/dataset/muhtarlik-adres-bilgileri
 * Girdi: prisma/data/muhtarlik_lokasyon.geojson (curl ile indirilmiş olmalı)
 * Çıktı: prisma/data/istanbul-mahalleler-by-ilce.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const geoPath = join(root, 'data', 'muhtarlik_lokasyon.geojson');
const outPath = join(root, 'data', 'istanbul-mahalleler-by-ilce.json');

/** İBB "İlçe Adı" (büyük harf) → Prisma seed'deki ilçe adı */
const IBB_ILCE_TO_CANONICAL = {
  ADALAR: 'Adalar',
  ARNAVUTKÖY: 'Arnavutköy',
  ATAŞEHİR: 'Ataşehir',
  AVCILAR: 'Avcılar',
  BAĞCILAR: 'Bağcılar',
  BAHÇELİEVLER: 'Bahçelievler',
  BAKIRKÖY: 'Bakırköy',
  BAŞAKŞEHİR: 'Başakşehir',
  BAYRAMPAŞA: 'Bayrampaşa',
  BEŞİKTAŞ: 'Beşiktaş',
  BEYKOZ: 'Beykoz',
  BEYLİKDÜZÜ: 'Beylikdüzü',
  BEYOĞLU: 'Beyoğlu',
  BÜYÜKÇEKMECE: 'Büyükçekmece',
  ÇATALCA: 'Çatalca',
  ÇEKMEKÖY: 'Çekmeköy',
  ESENLER: 'Esenler',
  ESENYURT: 'Esenyurt',
  EYÜPSULTAN: 'Eyüpsultan',
  FATİH: 'Fatih',
  GAZİOSMANPAŞA: 'Gaziosmanpaşa',
  GÜNGÖREN: 'Güngören',
  KADIKÖY: 'Kadıköy',
  KAĞITHANE: 'Kağıthane',
  KARTAL: 'Kartal',
  KÜÇÜKÇEKMECE: 'Küçükçekmece',
  MALTEPE: 'Maltepe',
  PENDİK: 'Pendik',
  SANCAKTEPE: 'Sancaktepe',
  /** İBB GeoJSON'da çoğunlukla ASCII I ile */
  SARIYER: 'Sarıyer',
  SİLİVRİ: 'Silivri',
  SULTANBEYLİ: 'Sultanbeyli',
  SULTANGAZİ: 'Sultangazi',
  ŞİLE: 'Şile',
  ŞİŞLİ: 'Şişli',
  TUZLA: 'Tuzla',
  ÜMRANİYE: 'Ümraniye',
  ÜSKÜDAR: 'Üsküdar',
  ZEYTİNBURNU: 'Zeytinburnu',
};

function mahalleDisplayFromIbb(raw) {
  const parts = String(raw || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const t = parts
    .map((w) => {
      const l = w.toLocaleLowerCase('tr-TR');
      return l.charAt(0).toLocaleUpperCase('tr-TR') + l.slice(1);
    })
    .join(' ');
  if (/mahallesi$/i.test(t)) return t.replace(/\s*Mahallesi$/i, '').replace(/\s*mahallesi$/i, '') + ' Mah.';
  if (/\bmah\.$/i.test(t)) return t;
  return `${t} Mah.`;
}

const geo = JSON.parse(readFileSync(geoPath, 'utf8'));
/** ilçe canonical → Set mahalle label */
const byDistrict = new Map();

for (const f of geo.features || []) {
  const p = f.properties || {};
  const ibbIlce = String(p['İlçe Adı'] || '').trim();
  const ibbMah = String(p['Mahalle Adı'] || '').trim();
  if (!ibbIlce || !ibbMah) continue;
  const canonical = IBB_ILCE_TO_CANONICAL[ibbIlce];
  if (!canonical) {
    console.warn('Bilinmeyen İBB ilçe:', ibbIlce);
    continue;
  }
  const label = mahalleDisplayFromIbb(ibbMah);
  if (!byDistrict.has(canonical)) byDistrict.set(canonical, new Set());
  byDistrict.get(canonical).add(label);
}

const out = {};
for (const [d, set] of byDistrict) {
  out[d] = [...set].sort((a, b) => a.localeCompare(b, 'tr-TR'));
}

writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log('Yazıldı:', outPath);
for (const k of Object.keys(out).sort((a, b) => a.localeCompare(b, 'tr-TR'))) {
  console.log(k, out[k].length);
}
console.log('ilçe sayısı', Object.keys(out).length);
