# Parça 5/6 — Test ve güncelleme

**Görev (yapay zeka):** Kurulumun çalıştığını doğrula. İsteğe bağlı seed. Güncelleme komutlarını not et.

```bash
export POINT_ROOT=/opt/pk1haziran
cd "$POINT_ROOT"
```

---

## 1. API health

`deploy/.env` içindeki `API_DOMAIN` ile:

```bash
curl -fsS "https://api.pointkurye.net.tr/v1/health"
```

**Beklenen:** HTTP 200, JSON.

Başarısızsa: `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs --tail=100 api caddy`

---

## 2. Tarayıcı (kullanıcıya söyle)

- `https://www.pointkurye.net.tr` — tanıtım / yönetim  
- `https://app.pointkurye.net.tr` — müşteri portalı  

---

## 3. İsteğe bağlı seed (sadece boş staging)

**Production’da dikkat** — demo kullanıcı oluşturabilir. Kullanıcı onayı olmadan çalıştırma.

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env run --rm api \
  sh -c "npm run db:seed -w @point/database"
```

---

## 4. Kod güncellemesi (ileride)

```bash
cd "$POINT_ROOT"
git pull origin main
./deploy/scripts/prod-build.sh
./deploy/scripts/prod-migrate.sh
./deploy/scripts/prod-up.sh
```

Domain değiştiyse mutlaka **prod-build** (NEXT_PUBLIC build-time).

---

## Parça 5 bitti — raporla

- health curl sonucu  
- Tarayıcı testi kullanıcıdan  

**Parça 6:** `06-hatalar-checklist.md`
