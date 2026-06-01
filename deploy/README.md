# Point — production deploy

Tam adımlar: **[docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)**

```bash
cp deploy/env.example deploy/.env   # düzenleyin
npm run deploy:build
npm run deploy:migrate
npm run deploy:up
```
