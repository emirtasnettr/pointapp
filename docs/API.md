# Point API — Endpoint özeti (`/v1`)

Tüm yanıtlar JSON. Kimlik doğrulama: `Authorization: Bearer <access>` (müşteri/kurye/yönetim). İdempotent kritik işlemlerde `Idempotency-Key` önerilir.

## Auth & oturum

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/auth/register/customer` | Müşteri kaydı (SMS OTP sonrası) |
| POST | `/auth/register/courier` | Kurye kaydı |
| POST | `/auth/login` | Telefon + şifre veya OTP akışı |
| POST | `/auth/refresh` | Refresh token rotation |
| POST | `/auth/logout` | Oturum düşürme |
| POST | `/auth/sms/send` | OTP gönder (rate limit) |
| POST | `/auth/sms/verify` | OTP doğrula |
| POST | `/auth/password/forgot` | SMS ile sıfırlama başlat |
| POST | `/auth/password/reset` | Kod + yeni şifre |

## RBAC (yönetim)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/admin/roles` | Rol listesi |
| GET | `/admin/permissions` | İzin listesi |
| PATCH | `/admin/roles/:id/permissions` | Rol-izin eşlemesi (sadece sistem yöneticisi) |
| GET | `/admin/users/:id/roles` | Kullanıcı rolleri |

## Sistem ayarları (sadece sistem yöneticisi)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/admin/settings` | Tüm ayarlar |
| PATCH | `/admin/settings/:key` | Tek anahtar güncelle |
| GET | `/admin/settings/commission` | Global komisyon |
| PATCH | `/admin/settings/commission` | Varsayılan %45 vb. |

## Storage & marka

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/admin/files/upload` | Logo / evrak (multipart, `kind`) |
| GET | `/admin/files/:id` | Metadata |
| GET | `/files/public/:id` | İmzalı URL veya public logo |

## SMS / ödeme provider (admin yapılandırma)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/admin/integrations/sms` | Aktif adapter + maskeli ayarlar |
| PATCH | `/admin/integrations/sms` | NETGSM vb. |
| GET | `/admin/integrations/payment` | PayTR / İyzico hazır alanlar |
| PATCH | `/admin/integrations/payment` | Merchant keys (şifreli depoda) |

## Coğrafya & fiyat matrisi

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/regions` | 8 bölge |
| GET | `/regions/:id/districts` | İlçeler |
| GET | `/districts/:id/neighborhoods` | Mahalle + ek ücret |
| GET | `/admin/pricing/matrix` | Aktif matris satırları |
| PUT | `/admin/pricing/matrix` | Toplu güncelleme |
| POST | `/admin/pricing/rules` | Gece / yoğunluk kuralı |
| POST | `/pricing/preview` | Anlık fiyat önizleme (müşteri formu) |

## Müşteri

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/customer/me` | Profil + `publicId` |
| PATCH | `/customer/me` | Sınırlı alanlar |
| GET | `/customer/addresses` | Adres listesi |
| POST | `/customer/addresses` | Yeni adres |
| PATCH | `/customer/addresses/:id` | favori / varsayılan |
| DELETE | `/customer/addresses/:id` | |

## Teslimat (müşteri)

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/deliveries` | Oluştur (araç tipi kuralı: paket >20kg → CAR) |
| GET | `/deliveries` | Liste |
| GET | `/deliveries/:id` | Detay + durum |
| GET | `/deliveries/:id/track` | Son konum + polyline önerisi |
| POST | `/deliveries/:id/cancel` | İptal kuralları |

## Ödeme

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/payments/intents` | Kart ön yetkilendirme |
| POST | `/payments/capture/:deliveryId` | Teslim sonrası veya anlık model |
| POST | `/payments/wallet/topup` | Kurumsal bakiye |
| GET | `/payments/methods` | Müşteri tipine göre görünür yöntemler |

## Kurye

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/courier/me` | Profil + araç |
| GET | `/courier/pool` | Havuzdaki işler (coğrafi filtre) |
| POST | `/courier/pool/:deliveryId/accept` | Atomik kabul |
| PATCH | `/courier/deliveries/:id/status` | Durum geçişleri |
| POST | `/courier/location` | Toplu veya tek delivery bağlı ping |
| GET | `/courier/wallet` | Bakiye + ledger |
| POST | `/courier/payout-requests` | Ödeme talebi |
| GET | `/courier/payout-requests` | Geçmiş |

## Operasyon (harita + manuel atama)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/ops/deliveries` | Filtreli operasyon görünümü |
| POST | `/ops/deliveries/:id/assign` | Manuel kurye atama |
| PATCH | `/ops/deliveries/:id/status` | Durum düzeltme |
| GET | `/ops/couriers/live` | Son bilinen konumlar |

## Finans & muhasebe

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/finance/payout-requests` | Talep kuyruğu |
| PATCH | `/finance/payout-requests/:id` | Onay / ödendi |
| GET | `/finance/reports/summary` | Ciro, komisyon, başarı oranı |

## Bildirim

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/notifications/device` | FCM token kaydı |
| GET | `/notifications` | In-app feed |
| PATCH | `/notifications/:id/read` | Okundu |

## Audit

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/admin/audit-logs` | Filtreli liste |

## Socket.IO (özet olaylar)

| Olay | Yön | Açıklama |
|------|-----|----------|
| `delivery:created` | server → ilgili odalar | Yeni iş |
| `delivery:status` | server ↔ client | Durum güncellemesi |
| `delivery:pool_updated` | server → kurye | Havuz diff |
| `location` | client → server | `{ deliveryId, lat, lng, accuracy }` |
| `courier:positions` | server → ops/müşteri | Seyreltilebilir broadcast |

Oda isimleri önerisi: `customer:{id}`, `courier:{id}`, `ops`, `delivery:{id}`.
