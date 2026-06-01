# Parça 4/6 — Prod Docker build

**Görev:** `deploy/docker-compose.prod.yml` ile **tüm imajları build et**. 15–40 dakika sürebilir.

```bash
export POINT_ROOT=/opt/point
cd "$POINT_ROOT"
chmod +x deploy/scripts/*.sh
```

`deploy/.env` yoksa **dur** → Parça 2.

---

## Build

```bash
./deploy/scripts/prod-build.sh
```

Alternatif:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env build
```

**Başarı:** exit code `0`.

---

## Build sonrası kontrol

```bash
docker images | grep -E 'point-prod|point|<none>' | head -20
```

`api`, `web-admin`, `web-customer` için imaj satırları görünmeli.

---

## Sık build hataları

| Hata | Çözüm |
|------|--------|
| `Killed` / OOM | RAM yetersiz; swap ekle veya VPS büyüt |
| `npm ci` fail | `git pull`; disk dolu mu `df -h` |
| network timeout | DNS/internet; tekrar dene |

Log tamamını kullanıcıya özetle.

---

## Parça 4 bitti

Build başarılı mı?  
→ **Parça 5:** `05-migrate-ve-up.md`
