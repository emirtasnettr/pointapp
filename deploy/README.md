# Point — production deploy

## Kurulum sihirbazı (önerilen)

VPS’te root SSH ile **tek komut**:

```bash
curl -fsSL https://raw.githubusercontent.com/emirtasnettr/pointapp/main/deploy/bootstrap.sh | sudo bash
```

Güvenli yol (önce inceleyin):

```bash
curl -fsSL https://raw.githubusercontent.com/emirtasnettr/pointapp/main/deploy/bootstrap.sh -o point-install.sh
less point-install.sh
sudo bash point-install.sh
```

Repo zaten klonluysa:

```bash
cd /opt/point   # veya proje kökü
sudo bash deploy/install.sh
```

### Sihirbaz ne yapar?

1. Docker / git / port ön kontrolleri  
2. Domain ve Let’s Encrypt e-posta soruları (veya env ile otomatik)  
3. Güçlü `POSTGRES_PASSWORD` + `JWT_SECRET` üretimi → `deploy/.env` (chmod 600)  
4. `docker compose` build → migration → `up -d`  
5. İsteğe bağlı UFW, seed, health kontrolü  

### Güncelleme

```bash
cd /opt/point
sudo bash deploy/install.sh --upgrade
```

### Yararlı komutlar

```bash
./deploy/scripts/prod-status.sh
./deploy/scripts/prod-logs.sh api
./deploy/install.sh --help
```

Tam rehber: **[docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)**
