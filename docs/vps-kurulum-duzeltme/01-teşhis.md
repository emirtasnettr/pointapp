# Parça 1/6 — Teşhis

**Görev:** Bu parçada **sadece teşhis** yap; henüz stack’i değiştirme. Sonuçları kullanıcıya özetle.

---

## Belirti

- Dışarıdan site/API **timeout**
- `ss` veya `netstat` ile **80 / 443** dinleyen süreç yok
- `docker ps` içinde çoğunlukla **postgres**, **redis** var
- **caddy**, **api**, **web-admin**, **web-customer** yok veya exited

---

## Asıl sebep (çoğu vaka)

Repoda **iki** compose dosyası var:

| Dosya | Servisler |
|-------|-----------|
| `docker-compose.yml` (kök) | **Sadece** postgres + redis |
| `deploy/docker-compose.prod.yml` | postgres, redis, **api**, **web-admin**, **web-customer**, **caddy** |

Yanlış komut örneği (prod açmaz):

```bash
docker compose up -d
docker compose --env-file .env up -d
```

Doğru dosya: **`deploy/docker-compose.prod.yml`**

---

## Kontrol komutları

```bash
export POINT_ROOT=/opt/point
cd "$POINT_ROOT"

ls -la deploy/docker-compose.prod.yml deploy/.env deploy/Caddyfile

docker compose ps -a
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps -a 2>/dev/null || echo "prod compose hiç çalışmamış"
```

**Raporla:**

1. `POINT_ROOT` gerçek yolu  
2. Üç dosya var mı?  
3. Hangi konteyner isimleri çalışıyor?  
4. 80/443 dinleniyor mu: `ss -tlnp | grep -E ':80|:443' || true`

---

## Port notu (yanlış bilgi düzeltmesi)

- `api` → **5001**
- `web-admin` → **3000** (3001 değil)
- `web-customer` → **3000**

Caddy `deploy/Caddyfile` buna göre yazılmıştır.

---

## Parça 1 bitti

Kullanıcı onayı → **Parça 2:** `02-dosyalar-ve-env.md`
