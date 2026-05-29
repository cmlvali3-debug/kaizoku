# Oitaku Import — Guide de déploiement

Garage d'importation de véhicules japonais et coréens.
Bot de recherche automatique sur 21 sources JDM & KDM.

---

## Structure du projet

```
oitaku-import/
├── frontend/
│   ├── index.html        ← Interface complète (ouvrir dans le navigateur)
│   └── app.js            ← Logique frontend + données de démo
│
├── backend/
│   ├── src/
│   │   ├── server.js             ← Serveur Express principal
│   │   ├── routes/
│   │   │   └── search.js         ← Route /api/search (agrège toutes les sources)
│   │   ├── adapters/
│   │   │   ├── encarAdapter.js   ← Encar Korea (pas de clé requise)
│   │   │   ├── yahooAdapter.js   ← Yahoo Auctions JP (clé gratuite)
│   │   │   ├── beforwardAdapter.js ← BE FORWARD (demande par email)
│   │   │   └── kcarAdapter.js    ← K Car scraper Playwright
│   │   └── jobs/
│   │       └── refreshListings.js ← Cron job toutes les 2h
│   ├── database/
│   │   └── schema.sql            ← Schéma Postgres (run une fois)
│   ├── .env.example              ← Variables à configurer
│   ├── package.json
│   └── railway.toml              ← Config déploiement Railway
│
└── CLAUDE_CODE_PROMPT.txt        ← Prompt à donner à Claude Code
```

---

## Utilisation immédiate (sans backend)

Ouvrir `frontend/index.html` directement dans le navigateur.
L'interface fonctionne avec les données de démo intégrées dans `app.js`.

---

## Déploiement complet

### 1. Backend sur Railway

```bash
cd backend
cp .env.example .env
# Remplir les clés API dans .env

npm install
npx playwright install chromium

# Déployer sur Railway
npm install -g @railway/cli
railway login
railway init
railway up
```

### 2. Base de données

```bash
# Dans Railway dashboard : ajouter un service Postgres
# Puis initialiser le schéma :
railway run npm run db:init
```

### 3. Frontend sur Vercel

```bash
cd frontend
npx vercel --prod
```

Dans `app.js`, remplacer :
```js
const BACKEND_URL = 'http://localhost:3001';
```
par l'URL Railway générée (ex: `https://oitaku-backend.up.railway.app`).

---

## APIs à configurer

| Source       | Délai     | Comment obtenir                                          |
|--------------|-----------|----------------------------------------------------------|
| Encar (KR)   | Immédiat  | Pas de clé — fonctionne déjà                            |
| Yahoo JP     | 1 jour    | developer.yahoo.co.jp → Create App → Auction API        |
| BE FORWARD   | 3–7 jours | Email api@beforward.jp (template dans CLAUDE_CODE_PROMPT)|
| Goo-net      | 5–10 jours| goo-net-exchange.com/partner                            |
| K Car        | Immédiat  | Scraper Playwright — pas de clé                         |

---

## Sources actives (21 au total)

### 🇯🇵 Japon (13)
**Enchères :** USS Auction, TAA Auction, CAA Auction, JU Auction, HAA Kobe, Yahoo! Auctions JP
**Occasion :** Goo-net Exchange, SBT Japan, BE FORWARD, CarSensor, Carused.jp, CardealPage, CarFromJapan

### 🇰🇷 Corée du Sud (8)
**Enchères :** Autobell (Hyundai Glovis), Lotte Auto Auction, Heydealer, AJ Sellcar
**Occasion :** Encar, K Car, Autowini, SK Encar
