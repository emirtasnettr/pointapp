/**
 * Müşteri cihazlarına test push bildirimi gönderir (Expo Push API).
 * Kullanım: node apps/api/scripts/send-customer-test-push.mjs
 * Ortam: apps/api/.env içindeki DATABASE_URL; isteğe bağlı EXPO_ACCESS_TOKEN
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, CustomerConsentType } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '../.env');
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnv();

const TITLE = 'Point';
const BODY = 'Bugün ilk gönderinize %15 indirim sizi bekliyor!';

function isExpoPushToken(token) {
  return /^Expo(nent)?PushToken\[.+\]$/.test(token) || /^ExponentPushToken\[.+\]$/.test(token);
}

async function sendExpo(messages) {
  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages.map((m) => ({ ...m, sound: 'default' }))),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  const marketingOnly = process.argv.includes('--marketing-only');
  const prisma = new PrismaClient();

  try {
    const sessions = await prisma.deviceSession.findMany({
      where: {
        pushToken: { not: null },
        user: { customerProfile: { isNot: null } },
      },
      select: { userId: true, pushToken: true },
    });

    let allowed = null;
    if (marketingOnly) {
      const profiles = await prisma.customerProfile.findMany({ select: { id: true, userId: true } });
      const consents = await prisma.customerConsent.findMany({
        where: {
          customerProfileId: { in: profiles.map((p) => p.id) },
          type: CustomerConsentType.MARKETING_ELECTRONIC,
        },
        orderBy: { recordedAt: 'desc' },
        select: { customerProfileId: true, granted: true },
      });
      const latest = new Map();
      for (const c of consents) {
        if (!latest.has(c.customerProfileId)) latest.set(c.customerProfileId, c.granted);
      }
      const opted = new Set(
        [...latest.entries()].filter(([, g]) => g).map(([id]) => id),
      );
      allowed = new Set(profiles.filter((p) => opted.has(p.id)).map((p) => p.userId));
    }

    const seen = new Set();
    const messages = [];
    const userIds = new Set();

    for (const s of sessions) {
      if (!s.pushToken || !isExpoPushToken(s.pushToken)) continue;
      if (allowed && !allowed.has(s.userId)) continue;
      if (seen.has(s.pushToken)) continue;
      seen.add(s.pushToken);
      userIds.add(s.userId);
      messages.push({
        to: s.pushToken,
        title: TITLE,
        body: BODY,
        data: { type: 'test' },
      });
    }

    console.log(`Hedef: ${userIds.size} müşteri, ${messages.length} push token`);

    if (messages.length === 0) {
      console.log(
        'Gönderilecek token yok. Müşteri uygulamasında Ayarlar → Bildirimler ile izin verin (fiziksel cihaz).',
      );
      return;
    }

    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const { ok, status, json } = await sendExpo(batch);
      console.log(`Batch ${i / 100 + 1}: HTTP ${status}`, ok ? 'OK' : 'FAIL');
      if (json?.data) {
        const errs = json.data.filter((t) => t.status === 'error');
        if (errs.length) console.log('Hatalar:', errs.slice(0, 5));
        const oks = json.data.filter((t) => t.status === 'ok').length;
        console.log(`  ${oks}/${json.data.length} ticket başarılı`);
      }
    }

    await prisma.notification.createMany({
      data: [...userIds].map((userId) => ({
        userId,
        channel: 'PUSH',
        title: TITLE,
        body: BODY,
      })),
    });
    console.log('Veritabanına bildirim kayıtları yazıldı.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
