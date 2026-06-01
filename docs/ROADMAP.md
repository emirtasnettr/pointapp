# Point — Yol haritası

## Faz 0 — Foundation (tamamlandı / devam)

- Monorepo workspaces, Docker Postgres+Redis, Prisma şema taslağı, Nest health, Next iskeletleri, Expo Router iskeleti, provider interface stubs (storage, SMS, payment), dokümantasyon.

## Faz 1 — MVP çekirdek

- Prisma migrate + tohum verileri (8 bölge, izin slug’ları, roller).
- Auth: JWT + refresh rotation, OTP akışı, kurye/müşteri kayıt kuralları (TC, telefon unique).
- Teslimat oluşturma + durum makinesi + havuz + atomik kabul.
- Basit fiyat matrisi okuma ve `pricing/preview`.
- Admin: sipariş listesi, kurye listesi, sistem ayarları (sistem yöneticisi).

## Faz 2 — Operasyon & canlılık

- Socket.IO odaları ve `delivery:*` olayları.
- Konum snapshot + müşteri takip ekranı (OSM).
- Ops haritası ve manuel atama.
- Bildirim: FCM token kaydı, kritik olaylar push.

## Faz 3 — Finans

- Ödeme provider: PayTR veya İyzico ilk adapter.
- Komisyon ve kurye ledger otomasyonu.
- Hakediş talepleri ve muhasebe onayı.

## Faz 4 — Kurumsal müşteri

- Bakiye, cari hesap bayrağı, fatura PDF üretimi ve storage.

## Faz 5 — Sertleştirme

- E2E, yük testi, güvenlik taraması, OTel, runbook’lar, KVKK dokümantasyonu.
