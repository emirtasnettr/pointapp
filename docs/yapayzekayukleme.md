# Point VPS kurulumu — yapay zeka rehberi (parçalı)

Tek seferde uzun metin veremiyorsanız **sırayla** aşağıdaki dosyaları yapay zekaya iletin. Her parçanın sonunda “Parça X bitti” deyip **sonraki parçayı** gönderin.

**Proje klasörü (VPS):** `point` — tipik yol `/opt/point` veya `/root/point`  
**GitHub:** https://github.com/emirtasnettr/pointapp.git (dal: `main`)

## Alan adları (pointkurye.net.tr)

DNS’te her biri için **A kaydı** → VPS IP:

| Host | Servis |
|------|--------|
| `api.pointkurye.net.tr` | API |
| `pointkurye.net.tr` | Tanıtım + yönetim (`web-admin`, köknokta) |
| `www.pointkurye.net.tr` | Tanıtım + yönetim (`web-admin`, www) |
| `app.pointkurye.net.tr` | Müşteri portalı (`web-customer`) |

Kök ve www **aynı site**; kurulum sihirbazı ikisini de otomatik yapılandırır (`ADMIN_DOMAINS`).

---

## Sıra

| # | Dosya | Ne yapılır |
|---|--------|------------|
| 1 | [01-giris.md](./yapayzekayukleme/01-giris.md) | Kurallar, mimari, genel bağlam |
| 2 | [02-sunucu.md](./yapayzekayukleme/02-sunucu.md) | Docker, firewall, sunucu kontrolleri |
| 3 | [03-dizin-dns-env.md](./yapayzekayukleme/03-dizin-dns-env.md) | Proje yolu, DNS, `deploy/.env` |
| 4 | [04-build-migrate-up.md](./yapayzekayukleme/04-build-migrate-up.md) | Build, migration, `up -d` |
| 5 | [05-test-guncelleme.md](./yapayzekayukleme/05-test-guncelleme.md) | Health test, seed, güncelleme |
| 6 | [06-hatalar-checklist.md](./yapayzekayukleme/06-hatalar-checklist.md) | Sık hatalar, kontrol listesi |

---

## Her parçayı yapay zekaya nasıl verirsiniz?

1. Parça dosyasının **tamamını** kopyalayın (üstteki “Görev” kutusu dahil).
2. Sonuna şunu ekleyin: *“Sadece bu parçadaki adımları uygula. Bitince özet ver; sonraki parçayı bekleyeceğim.”*
3. Parça 1 → 2 → … → 6 sırası **değişmez**.

**İnsan notu:** Parça 3’ten önce gerçek domain adlarınızı ve (şifre hariç) env planınızı yapay zekaya yazın.

---

## Kısa hatırlatma (her parçada geçer)

```bash
cd /opt/point    # veya point'in gerçek yolu — /root içinde DEĞİL
ls deploy/env.example # bu dosya görünmeli
```

İnsan odaklı özet: [DEPLOYMENT.md](./DEPLOYMENT.md)

**Sadece Postgres+Redis çalışıyor / 80-443 timeout:** [vps-kurulum-duzeltme.md](./vps-kurulum-duzeltme.md) (parçalı düzeltme rehberi)
