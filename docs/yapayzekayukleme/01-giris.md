# Parça 1/6 — Giriş ve kurallar

**Görev (yapay zeka):** Bu parçayı oku; henüz komut çalıştırma. Sonraki parçada sunucu hazırlığı var. Kullanıcı “Parça 2’ye geç” deyince devam et.

---

## Proje

**Point** — monorepo: NestJS API, iki Next.js web uygulaması, PostgreSQL, Docker Compose, Caddy HTTPS.

- **Repo:** https://github.com/emirtasnettr/pk1haziran.git  
- **Dal:** `main`  
- **VPS klasör adı:** `pk1haziran` (dosyalar buraya aktarıldı)
- **Alan adı:** `pointkurye.net.tr` → `api.` / `www.` / `app.` alt alan adları (Parça 3)

---

## Kritik kurallar

1. Komutlar **proje kökünde** çalışır (`package.json` + `deploy/` burada).
2. **`/root` içinde `npm` veya `cp deploy/...` çalıştırma** — `package.json` / `deploy/env.example` bulunamaz.
3. Her oturum başı:
   ```bash
   cd /opt/pk1haziran   # veya /root/pk1haziran — gerçek yolu kullan
   pwd
   ls deploy/env.example
   ```
4. `deploy/.env` sunucuda oluşturulur; repoda yok.
5. DNS A kayıtları VPS IP’sine işaret etmezse Caddy HTTPS sertifikası alamayabilir (Parça 3–4).
6. `NEXT_PUBLIC_*` değişkenleri **Docker build** sırasında gömülür; domain değişince web **yeniden build** gerekir.

---

## Mimari

| Bileşen | Erişim (pointkurye.net.tr) |
|---------|----------------------------|
| API (NestJS `/v1`) | `https://api.pointkurye.net.tr` |
| web-admin (tanıtım + panel) | `https://www.pointkurye.net.tr` |
| web-customer (müşteri) | `https://app.pointkurye.net.tr` |
| PostgreSQL | Docker içi: `postgres:5432` |
| Redis | Docker içi |
| Caddy | 80, 443 |

Dosyalar:

- `deploy/docker-compose.prod.yml`
- `deploy/env.example` → `deploy/.env`

---

## Parça 1 bitti

Kullanıcıdan onay al → **Parça 2:** `02-sunucu.md` (Docker, portlar, kontroller).
