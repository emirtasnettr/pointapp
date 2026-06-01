# Parça 5/6 — Migration ve prod stack başlat

**Görev:** Migration çalıştır, ardından **prod** stack’i `up -d` ile başlat.

```bash
export POINT_ROOT=/opt/point
cd "$POINT_ROOT"
```

Build başarısızsa **dur** → Parça 4.

---

## 1. Migration

```bash
./deploy/scripts/prod-migrate.sh
```

Alternatif:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env --profile init run --rm migrate
```

---

## 2. Servisleri başlat

```bash
./deploy/scripts/prod-up.sh
```

Alternatif:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --force-recreate
```

**Not:** Komut **repo kökünden**; `-f deploy/docker-compose.prod.yml` şart.

---

## 3. Çalışan servisler

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps
```

**Beklenen (State: running):**

- `point-prod-postgres-1` (veya benzeri isim)
- `point-prod-redis-1`
- `point-prod-api-1`
- `point-prod-web-admin-1`
- `point-prod-web-customer-1`
- `point-prod-caddy-1`

`migrate` bir kez çalışıp çıkar — normal.

---

## 4. Log (hata varsa)

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs --tail=60 caddy
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs --tail=60 api
```

---

## Parça 5 bitti

`ps` tablosunu özetle.  
→ **Parça 6:** `06-dogrulama.md`
