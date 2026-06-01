# Point — VPS / Docker ile canlıya alma

Bu rehber, monorepo’yu tek VPS üzerinde **Docker Compose + Caddy (HTTPS)** ile çalıştırmak içindir.

## Hızlı kurulum (sihirbaz — önerilen)

Root SSH erişiminiz varsa en kolay yol:

```bash
curl -fsSL https://raw.githubusercontent.com/emirtasnettr/pointapp/main/deploy/bootstrap.sh | sudo bash
```

Sihirbaz interaktif olarak domain, TLS e-postası sorar; secret’ları üretir; build + migrate + servisleri başlatır.

**Önce DNS:** Ana domain için `api`, `www`, `app` A kayıtları sunucu IP’sine yönlenmeli (TLS için).

| Seçenek | Açıklama |
|---------|----------|
| `sudo bash deploy/install.sh` | Repo içinden kurulum |
| `sudo bash deploy/install.sh --upgrade` | `git pull` + yeniden build |
| `sudo bash deploy/install.sh --seed` | Demo verisi (staging) |
| `sudo bash deploy/install.sh --help` | Tüm seçenekler |

**Non-interactive** (otomasyon):

```bash
export POINT_INSTALL_NONINTERACTIVE=1
export POINT_BASE_DOMAIN=pointkurye.net.tr
export POINT_CADDY_EMAIL=admin@pointkurye.net.tr
sudo bash deploy/install.sh
```

---

## Manuel kurulum

Sihirbaz kullanmak istemezseniz aşağıdaki adımlar geçerlidir.

## Önkoşullar

| Gereksinim | Not |
|------------|-----|
| VPS | Ubuntu **24.04 LTS** önerilir, en az **4 GB RAM** |
| DNS | `API_DOMAIN`, `ADMIN_DOMAIN`, `CUSTOMER_DOMAIN` → sunucu IP (A kaydı) |
| Repo | Git ile sunucuya clone veya CI artefact |

**Servis eşlemesi**

| Domain (örnek) | Konteyner | Açıklama |
|----------------|-----------|----------|
| `api.pointkurye.net.tr` | `api:5001` | NestJS `/v1` |
| `www.pointkurye.net.tr` | `web-admin:3000` | Tanıtım + yönetim paneli |
| `app.pointkurye.net.tr` | `web-customer:3000` | Müşteri portalı |

## 1. Sunucu hazırlığı

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
# Oturumu kapatıp açın, sonra:
docker compose version
```

Firewall (UFW örneği):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Projeyi alın

```bash
sudo mkdir -p /opt/point
sudo chown "$USER:$USER" /opt/point
git clone <repo-url> /opt/point
cd /opt/point
```

## 3. Ortam dosyası

```bash
cp deploy/env.example deploy/.env
nano deploy/.env
```

**Mutlaka değiştirin**

- `POSTGRES_PASSWORD`, `JWT_SECRET` (uzun rastgele)
- `API_DOMAIN`, `ADMIN_DOMAIN`, `CUSTOMER_DOMAIN`, `CADDY_EMAIL`
- `PUBLIC_API_ORIGIN` → `https://api...` (**/v1 yok**)
- `NEXT_PUBLIC_API_URL` → `https://api.../v1`
- `CORS_ORIGINS` → panel ve app tam URL’leri
- `POINT_SMS_SIMULATION=0` (gerçek SMS için provider ayarları admin panelinden)

`deploy/.env` repoya **commit edilmez**.

## 4. İlk kurulum (build + migration + çalıştır)

Monorepo **kök dizininden**:

```bash
chmod +x deploy/scripts/*.sh
./deploy/scripts/prod-build.sh
./deploy/scripts/prod-migrate.sh
./deploy/scripts/prod-up.sh
```

İsteğe bağlı ilk veri (yalnızca boş DB’de, staging):

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env run --rm \
  -e DATABASE_URL="$DATABASE_URL" api sh -c "npm run db:seed -w @point/database"
```

> Seed production’da dikkatli kullanın; demo kullanıcı/şifre oluşturabilir.

## 5. Doğrulama

```bash
curl -sS "https://api.pointkurye.net.tr/v1/health"
```

Tarayıcıda `https://www.pointkurye.net.tr` ve `https://app.pointkurye.net.tr` açın. Mobil uygulamalarda API URL: `https://api.pointkurye.net.tr/v1`.

## 6. Güncelleme (yeni sürüm)

```bash
cd /opt/point
git pull
./deploy/scripts/prod-build.sh
./deploy/scripts/prod-migrate.sh
./deploy/scripts/prod-up.sh
```

## Dosya yapısı

```
deploy/
  install.sh           # Kurulum sihirbazı
  bootstrap.sh         # Tek satır VPS girişi
  lib/                 # common, preflight, write-env
  docker-compose.prod.yml
  Dockerfile.api
  Dockerfile.web
  Dockerfile.migrate
  Caddyfile
  env.example          # şablon → .env
  scripts/
    prod-build.sh
    prod-migrate.sh
    prod-up.sh
    prod-status.sh
    prod-logs.sh
```

Kalıcı veriler: Docker volume `point_pg_data`, `point_api_storage` (yüklenen dosyalar).

## Sorun giderme

| Belirti | Kontrol |
|---------|---------|
| 502 / Caddy | `docker compose ... logs api web-admin` |
| CORS hatası | `CORS_ORIGINS` tam eşleşmeli (şema + host, port yok) |
| Logo/görsel URL kırık | `PUBLIC_API_ORIGIN` HTTPS ve dışarıdan erişilebilir |
| Migration hata | `deploy/.env` içindeki `DATABASE_URL` postgres host adı `postgres` |
| Next eski API | Web imajını **yeniden build** (`NEXT_PUBLIC_*` build-time) |

## Docker kullanmadan (ileri seviye)

Aynı env değişkenleriyle: `npm ci`, `npm run db:migrate:deploy`, `npm run build`, API için `node apps/api/dist/main.js`, web için `npm run start -w @point/web-admin` + Nginx — ayrıntı için bu dosyadaki env tablosunu referans alın.

## İlgili

- **Yapay zeka / VPS operatörü:** [yapayzekayukleme.md](./yapayzekayukleme.md) — parçalı rehber (`docs/yapayzekayukleme/01` … `06`, `/opt/point` klasörü)
- Mimari: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Lokal geliştirme: kök `package.json` → `npm run setup:local`, `npm run dev`
