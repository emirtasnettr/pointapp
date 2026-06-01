#!/usr/bin/env node
/**
 * Lokal geliştirme için sabit .env şablonlarını yazar (gitignore’da).
 * `npm run dev` öncesi çalışır — tek komutla çalışır ortam.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Fiziksel telefon (Expo Go) için LAN IPv4 — localhost yerine kullanılır. */
function detectLanIpv4() {
  const candidates = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.family !== 'IPv4' || a.internal) continue;
      candidates.push(a.address);
    }
  }
  const preferred =
    candidates.find((ip) => ip.startsWith('192.168.')) ??
    candidates.find((ip) => ip.startsWith('10.')) ??
    candidates[0];
  return preferred ?? null;
}

function write(rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  console.log('[sync-local-env] yazıldı:', rel);
}

const dbUrl = 'postgresql://point:point@localhost:5432/point?schema=public';

const apiPort = process.env.POINT_API_PORT || '7199';
const adminPort = process.env.WEB_ADMIN_PORT || '7200';
const customerPort = process.env.WEB_CUSTOMER_PORT || '7201';

const apiPublic = `http://localhost:${apiPort}/v1`;
const customerWeb = `http://localhost:${customerPort}`;
const lanIp = detectLanIpv4();
const apiLan = lanIp ? `http://${lanIp}:${apiPort}/v1` : apiPublic;

write(
  'apps/api/.env',
  `# sync-local-env (npm run dev) — üretimde kullanmayın
DATABASE_URL="${dbUrl}"
PORT=${apiPort}
JWT_SECRET=point-dev-jwt-change-me-local-only
# CORS_ORIGINS boş: Nest lokalde tüm origin’lere izin verir (main.ts)
`,
);

write('packages/database/.env', `DATABASE_URL="${dbUrl}"\n`);

write(
  'apps/web-admin/.env.local',
  `# sync-local-env — tanıtım sitesi :${adminPort}, müşteri web :${customerPort}
NEXT_PUBLIC_API_URL=${apiPublic}
NEXT_PUBLIC_CUSTOMER_WEB_URL=${customerWeb}
`,
);

const marketingWeb = `http://localhost:${adminPort}`;

write(
  'apps/web-customer/.env.local',
  `# sync-local-env
NEXT_PUBLIC_API_URL=${apiPublic}
NEXT_PUBLIC_MARKETING_WEB_URL=${marketingWeb}
`,
);

write(
  'apps/mobile-customer/.env',
  `# sync-local-env — simülatör: localhost; fiziksel telefon: LAN IP (${lanIp ?? 'bulunamadı'})
EXPO_PUBLIC_API_URL=${apiLan}
# Push: \`cd apps/mobile-customer && npx eas init\` sonrası projectId ekleyin
`,
);

write(
  'apps/mobile-courier/.env',
  `# sync-local-env — simülatör: localhost; fiziksel telefon: LAN IP (${lanIp ?? 'bulunamadı'})
EXPO_PUBLIC_API_URL=${apiLan}
`,
);

console.log(
  `[sync-local-env] Web: tanıtım http://localhost:${adminPort} · müşteri ${customerWeb} · API ${apiPublic}`,
);
if (lanIp) {
  console.log(`[sync-local-env] Mobil API (telefon): ${apiLan}`);
}
