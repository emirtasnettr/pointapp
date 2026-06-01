# VPS kurulum düzeltme — parçalı rehber

Sadece **Postgres + Redis** çalışıyor, **80/443 timeout** alıyorsanız bu rehberi **sırayla** yapay zekaya verin.

**Proje yolu (VPS):** `/opt/point` (veya `pointapp` clone dizini)  
**Alan adı:** `pointkurye.net.tr`  
**Doğru compose:** `deploy/docker-compose.prod.yml` — kök `docker-compose.yml` **değil**

---

## Parçalar

| # | Dosya | Konu |
|---|--------|------|
| 1 | [01-teşhis.md](./vps-kurulum-duzeltme/01-teşhis.md) | Sorunun nedeni, kontroller |
| 2 | [02-dosyalar-ve-env.md](./vps-kurulum-duzeltme/02-dosyalar-ve-env.md) | git pull, `.env`, dosya varlığı |
| 3 | [03-yanlis-compose-kapat.md](./vps-kurulum-duzeltme/03-yanlis-compose-kapat.md) | Dev stack’i durdur |
| 4 | [04-prod-build.md](./vps-kurulum-duzeltme/04-prod-build.md) | Docker imaj build |
| 5 | [05-migrate-ve-up.md](./vps-kurulum-duzeltme/05-migrate-ve-up.md) | Migration + servisleri başlat |
| 6 | [06-dogrulama.md](./vps-kurulum-duzeltme/06-dogrulama.md) | ps, port, curl, hatalar |

Her parçanın sonunda dur; kullanıcı “sonraki parça” deyince devam et.

**Yapay zekaya her seferinde ekle:**

> Komutları `/opt/point` içinde çalıştır. Prod için `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env` kullan; kök `docker-compose.yml` kullanma.

İlk kurulum rehberi: [yapayzekayukleme.md](./yapayzekayukleme.md)
