# Parça 3/6 — Yanlış (dev) compose’u kapat

**Görev:** Kök `docker-compose.yml` ile kalkan **sadece postgres+redis** stack’ini durdur. Prod stack’e henüz dokunma.

```bash
export POINT_ROOT=/opt/point
cd "$POINT_ROOT"
```

---

## 1. Dev stack durdur

```bash
docker compose down
```

Bu komut **yalnızca kök** `docker-compose.yml` servislerini kapatır.

---

## 2. Eski prod denemesi varsa

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env down
```

(Hata verse de devam et.)

---

## 3. Durum

```bash
docker ps -a
```

İsteğe bağlı: çakışan isimler için temizlik (dikkatli):

```bash
docker ps -aq | xargs -r docker stop
```

Sadece Point ile ilgili konteynerleri durdur; başka projeler varsa **tümünü stop etme**.

---

## Parça 3 bitti

`docker ps` özeti ver.  
→ **Parça 4:** `04-prod-build.md`
