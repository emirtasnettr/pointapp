# Parça 6/6 — Doğrulama ve referans

**Görev:** Kurulumun çalıştığını doğrula. Gerekirse `deploy/Caddyfile` ve compose özetini kontrol et.

```bash
export POINT_ROOT=/opt/point
cd "$POINT_ROOT"
```

---

## 1. Portlar

```bash
ss -tlnp | grep -E ':80|:443'
```

**80 ve 443** dinlenmeli (caddy).

---

## 2. API health

```bash
curl -fsS "https://api.pointkurye.net.tr/v1/health"
```

HTTP 200 beklenir.

---

## 3. Tarayıcı (kullanıcı)

- https://www.pointkurye.net.tr  
- https://app.pointkurye.net.tr  

---

## 4. Caddyfile (referans — portlar)

Dosya: `deploy/Caddyfile`

```caddyfile
{
	email {$CADDY_EMAIL}
}

{$API_DOMAIN} {
	encode gzip
	reverse_proxy api:5001
}

{$ADMIN_DOMAIN} {
	encode gzip
	reverse_proxy web-admin:3000
}

{$CUSTOMER_DOMAIN} {
	encode gzip
	reverse_proxy web-customer:3000
}
```

`web-admin:3001` **kullanılmaz**.

---

## 5. Prod compose’ta olması gereken servisler

`deploy/docker-compose.prod.yml` içinde şunlar tanımlı olmalı:

- postgres  
- redis  
- migrate (profile: init)  
- api  
- web-admin  
- web-customer  
- caddy (**ports: 80:80, 443:443**)

VPS’te eksikse: `git pull origin main` ve Parça 4–5 tekrar.

Tam dosya repoda:  
https://github.com/emirtasnettr/pointapp/blob/main/deploy/docker-compose.prod.yml

---

## 6. Hâlâ sadece postgres/redis ise

| Kontrol | Komut |
|---------|--------|
| Yanlış compose | `docker compose ps` vs `docker compose -f deploy/... ps` |
| Build yapılmadı | Parça 4 tekrar |
| Caddy exited | `logs caddy` — DNS / ACME |
| API crash | `logs api` — DATABASE_URL, JWT |

---

## Kurulum tamam

Tüm kontroller OK → Point prod stack çalışıyor.

**Güncelleme (ileride):**

```bash
cd "$POINT_ROOT"
git pull
./deploy/scripts/prod-build.sh
./deploy/scripts/prod-migrate.sh
./deploy/scripts/prod-up.sh
```
