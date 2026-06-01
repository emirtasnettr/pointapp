# Parça 6/6 — Hatalar ve kontrol listesi

**Görev (yapay zeka):** Önceki parçalarda kalan sorunları bu tabloyla eşleştir. Kontrol listesini tamamla; kullanıcıya final özet ver.

---

## Sık hatalar

| Belirti | Sebep | Çözüm |
|---------|--------|--------|
| `cannot stat 'deploy/env.example'` | Yanlış dizin (`/root`) | `cd` → point kökü |
| `ENOENT .../root/package.json` | npm kök dışında | `cd "$POINT_ROOT"` |
| Caddy ACME hatası | DNS yayılmadı | A kayıtları; bekle; `logs caddy` |
| 502 Bad Gateway | api/web çökmüş | `logs api` `logs web-admin` |
| CORS (tarayıcı) | `CORS_ORIGINS` yanlış | Tam `https://` URL; `up -d api` |
| Web yanlış API | `NEXT_PUBLIC_*` build öncesi hatalı | `.env` düzelt → prod-build → prod-up |
| Migration refused | Postgres hazır değil | postgres up; healthcheck; migrate tekrar |
| Build OOM | RAM | swap / büyük VPS |

---

## Final kontrol listesi

- [ ] `POINT_ROOT` doğru, `package.json` + `deploy/env.example` var  
- [ ] Docker + compose OK  
- [ ] DNS → VPS IP (veya bilinçli ertelendi)  
- [ ] `deploy/.env` dolu, `DATABASE_URL` host=`postgres`  
- [ ] prod-build başarılı  
- [ ] prod-migrate başarılı  
- [ ] prod-up → api, web-admin, web-customer, postgres, redis, caddy running  
- [ ] `curl https://.../v1/health` → 200  
- [ ] Panel + müşteri sitesi açılıyor  

---

## Kurulum tamam

Tüm maddeler OK ise Point VPS kurulumu bitti.

Kalan sorun varsa: belirti + `docker compose ... logs` çıktısı iste.

**Repoda ek dosyalar:** `docs/DEPLOYMENT.md`, `deploy/docker-compose.prod.yml`

---

## Tüm parçalar (özet sıra)

1. `01-giris.md` — kurallar  
2. `02-sunucu.md` — Docker  
3. `03-dizin-dns-env.md` — .env  
4. `04-build-migrate-up.md` — deploy  
5. `05-test-guncelleme.md` — test  
6. `06-hatalar-checklist.md` — bu dosya  
