# Parça 2/6 — Sunucu hazırlığı

**Görev (yapay zeka):** Ubuntu VPS’te Docker ve temel kontrolleri yap / doğrula. Proje kurulumuna **henüz girme** (Parça 4’te build var).

**Önce:** `cd /opt/pk1haziran` (veya pk1haziran yolu) — bu parçada zorunlu değil ama sonrakiler için alışkanlık olsun.

---

## Gereksinimler

- Ubuntu 22.04 veya 24.04 LTS  
- RAM: **en az 4 GB** (build için; 2 GB + swap riskli)  
- Disk: 40 GB+  
- Portlar: **22**, **80**, **443** açık  

---

## Kontrol komutları

```bash
docker compose version
docker info
free -h
df -h
```

Hepsi hatasız dönmeli.

---

## Docker yoksa kur

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
```

Oturumu kapat-aç veya: `newgrp docker`  
Tekrar: `docker compose version`

---

## Firewall (UFW örneği)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## Notlar

- Host’ta **Node.js şart değil** (build Docker içinde).  
- `npm run deploy:*` host’ta `npm` ister; yoksa Parça 4’te doğrudan `docker compose` komutları kullanılır.

---

## Parça 2 bitti — raporla

Kullanıcıya yaz: Docker sürümü, RAM/disk özeti, UFW durumu.  
Sonra **Parça 3:** `03-dizin-dns-env.md`
