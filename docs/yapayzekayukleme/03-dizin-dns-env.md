# Parça 3/6 — Proje dizini, DNS, deploy/.env

**Görev (yapay zeka):** Proje kökünü bul, `deploy/.env` oluştur ve doldur. **Build çalıştırma** (Parça 4).

---

## 1. Proje kökünü bul

```bash
ls -la /opt/pk1haziran/package.json 2>/dev/null || ls -la /root/pk1haziran/package.json
```

Bulunan yolu kaydet:

```bash
export POINT_ROOT=/opt/pk1haziran   # GERÇEK YOLU YAZ
cd "$POINT_ROOT"
```

Doğrulama:

```bash
test -f package.json && test -f deploy/env.example && test -f deploy/docker-compose.prod.yml && echo OK
```

`OK` görünmeli. Değilse: `git clone https://github.com/emirtasnettr/pk1haziran.git /opt/pk1haziran` ve tekrar dene.

---

## 2. DNS (pointkurye.net.tr)

Her hostname için **A kaydı** → VPS public IP:

| Host | `deploy/.env` değişkeni |
|------|-------------------------|
| `api.pointkurye.net.tr` | `API_DOMAIN` |
| `www.pointkurye.net.tr` | `ADMIN_DOMAIN` |
| `app.pointkurye.net.tr` | `CUSTOMER_DOMAIN` |

Kontrol:

```bash
dig +short api.pointkurye.net.tr
dig +short www.pointkurye.net.tr
dig +short app.pointkurye.net.tr
curl -4 ifconfig.me
```

Üç `dig` çıktısı VPS IP ile aynı olmalı. Değilse kullanıcıyı uyar; Caddy sertifikası gecikebilir.

**`CADDY_EMAIL`:** örn. `admin@pointkurye.net.tr` (Let’s Encrypt).

---

## 3. deploy/.env

```bash
cd "$POINT_ROOT"
cp deploy/env.example deploy/.env
nano deploy/.env
```

**CHANGE_ME bırakma.** `deploy/env.example` zaten `pointkurye.net.tr` için hazır; şifreleri ve `JWT_SECRET` üret.

| Değişken | Canlı değer (örnek) |
|----------|---------------------|
| `POSTGRES_PASSWORD` | Güçlü rastgele |
| `DATABASE_URL` | `postgresql://point:ŞİFRE@postgres:5432/point?schema=public` |
| `JWT_SECRET` | 32+ karakter rastgele |
| `PUBLIC_API_ORIGIN` | `https://api.pointkurye.net.tr` |
| `NEXT_PUBLIC_API_URL` | `https://api.pointkurye.net.tr/v1` |
| `NEXT_PUBLIC_CUSTOMER_WEB_URL` | `https://app.pointkurye.net.tr` |
| `NEXT_PUBLIC_MARKETING_WEB_URL` | `https://www.pointkurye.net.tr` |
| `CORS_ORIGINS` | `https://www.pointkurye.net.tr,https://app.pointkurye.net.tr` |
| `API_DOMAIN` | `api.pointkurye.net.tr` |
| `ADMIN_DOMAIN` | `www.pointkurye.net.tr` |
| `CUSTOMER_DOMAIN` | `app.pointkurye.net.tr` |
| `CADDY_EMAIL` | `admin@pointkurye.net.tr` |
| `POINT_SMS_SIMULATION` | Canlı: `0` |

Kaydet. Şifreleri kullanıcıya **güvenli kanaldan** iletmesini söyle; sohbete yapıştırmasın.

---

## Parça 3 bitti — raporla

- `POINT_ROOT` yolu  
- `deploy/.env` var mı (içerik gösterme)  
- DNS özeti  

**Parça 4:** `04-build-migrate-up.md`
