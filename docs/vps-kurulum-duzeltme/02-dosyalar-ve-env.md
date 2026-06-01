# Parça 2/6 — Git pull ve deploy/.env

**Görev:** Repoyu güncelle, `deploy/.env` ve prod compose dosyasının varlığını doğrula. **Build/up çalıştırma** (Parça 4–5).

```bash
export POINT_ROOT=/opt/point
cd "$POINT_ROOT"
```

---

## 1. Git pull

```bash
git pull origin main
```

---

## 2. Zorunlu dosyalar

```bash
test -f deploy/docker-compose.prod.yml && echo "compose OK"
test -f deploy/.env && echo "env OK"
test -f deploy/Caddyfile && echo "caddy OK"
test -f deploy/Dockerfile.api && echo "dockerfile api OK"
```

Hepsi `OK` olmalı.

---

## 3. deploy/.env içeriği (kontrol, şifreleri sohbete yazma)

sŞunlar **dolu** olmalı (örnek hostlar):


| Değişken              | Beklenen                              |
| --------------------- | ------------------------------------- |
| `API_DOMAIN`          | `api.pointkurye.net.tr`               |
| `ADMIN_DOMAIN`        | `www.pointkurye.net.tr`               |
| `CUSTOMER_DOMAIN`     | `app.pointkurye.net.tr`               |
| `PUBLIC_API_ORIGIN`   | `https://api.pointkurye.net.tr`       |
| `NEXT_PUBLIC_API_URL` | `https://api.pointkurye.net.tr/v1`    |
| `DATABASE_URL`        | host `**postgres`** (localhost değil) |
| `POSTGRES_PASSWORD`   | boş/CHANGE_ME değil                   |
| `JWT_SECRET`          | boş/CHANGE_ME değil                   |


```bash
grep -E '^(API_DOMAIN|ADMIN_DOMAIN|CUSTOMER_DOMAIN|DATABASE_URL)=' deploy/.env | sed 's/PASSWORD=.*/PASSWORD=***/'
```

Eksikse `deploy/env.example` kopyalayıp kullanıcıdan değer iste veya repodaki `deploy/.env` ile doldur.

---

## 4. DNS (kısa)

```bash
dig +short api.pointkurye.net.tr
dig +short www.pointkurye.net.tr
dig +short app.pointkurye.net.tr
curl -4 ifconfig.me
```

IP’ler VPS ile uyumlu olmalı (Caddy sertifikası için).

---

## Parça 2 bitti

Özet: pull OK mi, üç deploy dosyası var mı, env domainleri doğru mu.  
→ **Parça 3:** `03-yanlis-compose-kapat.md`