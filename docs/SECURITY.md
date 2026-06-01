# Point — Güvenlik özeti

Bu belge uygulanan güvenlik kontrollerini ve operasyonel gereksinimleri özetler.

## Production ortam değişkenleri (zorunlu)

| Değişken | Açıklama |
|----------|----------|
| `JWT_SECRET` | En az 32 karakter; `point-dev-jwt-change-me` kabul edilmez |
| `CORS_ORIGINS` | Virgülle ayrılmış tam origin listesi |
| `POINT_SMS_SIMULATION` | `0` (gerçek SMS) |
| `NODE_ENV` | `production` |

`deploy/.env` **asla** repoya commit edilmemelidir. Daha önce sızdıysa tüm secret’ları rotate edin.

## API

- **Rate limit:** Global `ThrottlerGuard`; login/register/track/auth handoff ek limitler.
- **RBAC:** Staff route’ları `StaffPermissionsGuard` + `AppRole` → izin eşlemesi (`apps/api/src/modules/auth/rbac/`).
- **OTP:** En fazla 5 hatalı deneme; gönderi takibi `TRACK_DELIVERY` SMS doğrulaması zorunlu.
- **Ödeme:** Kart siparişleri PSP onayı olmadan `CAPTURED` olmaz (`PENDING`).
- **Dosyalar:** Yalnızca tanımlı public prefix’ler kimliksiz; diğerleri staff/courier JWT.
- **HTML:** `sanitize-html` paketi ile zengin metin temizleme (script, event handler, tehlikeli URL’ler).
- **Handoff:** Tek kullanımlık kod (2 dk); JWT artık URL hash’inde taşınmaz.
- **JWT:** Customer/courier için aktif kullanıcı kontrolü; production’da zayıf secret yok.

## Web

- Güvenlik başlıkları (`X-Frame-Options`, `nosniff`, `Referrer-Policy`).
- Müşteri token’ı hâlâ `localStorage` — XSS riskine karşı içerik sanitizasyonu ve CSP ileride önerilir.

## Mobil

- Token: `expo-secure-store`.
- Production’da `EXPO_PUBLIC_API_URL` zorunlu.
- Kampanya/yasal HTML: WebView `about:blank`, JS kapalı.

## Migration

Güvenlik migration’ı: `20260601120000_security_handoff_track_otp` (`AuthHandoffCode`, `TRACK_DELIVERY` OTP).

Canlıda: `npm run db:migrate` (veya `deploy/scripts/prod-migrate.sh`).

## Bilinen sonraki adımlar

- Gerçek ödeme sağlayıcısı (intent + webhook → `CAPTURED`).
- Müşteri paneli için httpOnly cookie / BFF (localStorage kaldırma).
- Content-Security-Policy (Next.js).
- `npm audit` uyarılarının periyodik giderilmesi.
