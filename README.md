# Point

Premium kurye ve anlık teslimat marketplace monoreposu.

## Gereksinimler

- Node.js 20+
- Docker (Postgres + Redis)

## Hızlı başlangıç

```bash
# 1) Ortam değişkenleri (Postgres docker-compose ile uyumlu)
cp packages/database/.env.example packages/database/.env
cp apps/api/.env.example apps/api/.env

# 2) Veritabanı
docker compose up -d

# 3) Bağımlılıklar ve Prisma Client (şema: packages/database)
npm install
export DATABASE_URL="postgresql://point:point@localhost:5432/point?schema=public"
npm run db:generate
npm run db:migrate:deploy

# 4) Hepsini birlikte çalıştır (API + iki web)
npm run dev
```

**Adresler**

| Servis | URL |
|--------|-----|
| API (health) | http://localhost:4000/v1/health |
| Müşteri web | http://localhost:3000 |
| Yönetim web | http://localhost:3001 |
| Mobil kurye | `npm run dev:mobile:courier` → Expo QR (**Point Kurye**) |
| Mobil müşteri | `npm run dev:mobile:customer` → Expo QR (**Point Müşteri**) |

`npm run dev` `concurrently` ile üç süreci birden başlatır. Ayrı ayrı: `npm run dev:api`, `npm run dev:web-admin`, `npm run dev:web-customer`.

**Notlar**

- **Mobil (Expo 54):** Kök `package.json` `overrides` ile `@point/mobile-courier` ve `@point/mobile-customer` altında **React 19.1.0**; web uygulamaları **React 18.3.1** ile ayrı tutulur.
- Prisma Client, şema dosyasına göre **repo kökündeki** `node_modules/.prisma/client` içine üretilir; API `@prisma/client` ile buradan okur.

## Dokümantasyon

- [Mimari](./docs/ARCHITECTURE.md)
- [API özeti](./docs/API.md)
- [Yol haritası](./docs/ROADMAP.md)

## Marka

Ana renk: `#16B24B`.
