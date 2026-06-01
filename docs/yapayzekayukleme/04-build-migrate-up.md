# Parça 4/6 — Build, migration, servisleri başlat

**Görev (yapay zeka):** `POINT_ROOT` içinde sırayla build → migrate → up. Her adımın exit code 0 olmalı.

```bash
export POINT_ROOT=/opt/point   # Parça 3’teki gerçek yol
cd "$POINT_ROOT"
```

`deploy/.env` yoksa **dur**, Parça 3’e dön.

---

## 0. Script izinleri

```bash
chmod +x deploy/scripts/*.sh
```

---

## 1. Build (15–40 dk)

```bash
./deploy/scripts/prod-build.sh
```

`npm` yoksa:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env build
```

**Başarı:** exit 0, imajlar oluştu.  
**OOM / killed:** RAM yetersiz — kullanıcıya swap veya daha büyük VPS öner.

---

## 2. Migration (ilk kurulum)

```bash
./deploy/scripts/prod-migrate.sh
```

Alternatif:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env --profile init run --rm migrate
```

**Başarı:** migration’lar uygulandı mesajı.  
**connection refused:** postgres henüz hazır değil — `docker compose ... up -d postgres`, 30 sn bekle, tekrar migrate.

---

## 3. Servisleri başlat

```bash
./deploy/scripts/prod-up.sh
```

Alternatif:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d
```

---

## 4. Durum

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs --tail=50 api
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs --tail=50 caddy
```

**Beklenen running:** `api`, `web-admin`, `web-customer`, `postgres`, `redis`, `caddy`.

---

## Parça 4 bitti — raporla

- `ps` çıktı özeti  
- api/caddy loglarında kritik hata var mı  

**Parça 5:** `05-test-guncelleme.md`
