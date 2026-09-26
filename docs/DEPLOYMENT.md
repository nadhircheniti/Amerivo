# Mise en ligne de test (staging) — gratuit

| Élément | Service | Plan |
|---|---|---|
| Site (`apps/web`) | Vercel | Hobby (gratuit, non commercial → test uniquement) |
| API (`apps/api`) | Render | Free (s'endort après 15 min, ~1 min pour se réveiller) |
| Base de données | Neon | Free (0,5 Go, n'expire pas) |

> Créez les comptes **au nom du client (Amerivo)** et ajoutez Demat-Vision comme membre.

## 1. Base de données — Neon

1. neon.com → **Create project** → nom `amerivo`, région **Europe (Frankfurt)**, Postgres 17.
2. **Connect** → copiez la *connection string* (elle finit par `?sslmode=require`).
   Gardez-la secrète : c'est la valeur de `DATABASE_URL`.

## 2. API — Render

1. render.com → **New → Blueprint** → dépôt `nadhircheniti/Amerivo` → Render lit `render.yaml`.
2. Remplissez les variables demandées :
   - `DATABASE_URL` : la connection string Neon (obligatoire)
   - `WEB_URL` : l'adresse Vercel, ex. `https://amerivo.vercel.app` (obligatoire, pour CORS)
   - les clés Clerk / Stripe / Daily / Resend : **laissez vide pour l'instant** (étapes suivantes)
3. **Apply**. Le premier déploiement prend quelques minutes :
   installation → build → migrations de la base → données de démonstration (`SEED_DEMO=1`) → démarrage.
4. Vérifiez : `https://amerivo-api.onrender.com/api/health` → `{"ok":true,…}`
   puis `…/api/teachers` → la liste des 5 professeurs de démonstration.

## 3. Site — Vercel

1. vercel.com → **Add New → Project** → dépôt `nadhircheniti/Amerivo`.
2. **Root Directory : `apps/web`** · Framework : Next.js (détecté).
3. Variable (utile dès l'étape « relier le site à l'API ») :
   `NEXT_PUBLIC_API_URL` = `https://amerivo-api.onrender.com/api`
4. **Deploy**.

## Fonctionnement au quotidien

- Chaque fusion sur `main` redéploie automatiquement Render et Vercel.
- Chaque branche / pull request a une adresse de prévisualisation Vercel.
- Les migrations de base de données s'appliquent au démarrage de l'API.
- Données de démonstration : mettre `SEED_DEMO` à `0` dans Render quand on n'en veut plus.

## Passage en production (payant)

- Vercel **Pro**, Render plan payant (pas de mise en veille), Neon payant à l'usage.
- Nouveau service Render + nouvelle base Neon dédiés à la production, `SEED_DEMO=0`.
- Clés **live** Stripe / Clerk / Daily, nom de domaine (ex. `amerivo.com` + `api.amerivo.com`).
