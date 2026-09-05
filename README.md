# 🎓 College Marketplace — AI/ML Enhanced Edition

A student buy-and-sell platform with **price prediction**, **content-based recommendations** and
**fraud detection**, served by a dedicated Python ML microservice.

---

## Architecture

```
┌──────────────────┐        ┌─────────────────────────┐
│  Frontend        │───────▶│  Node.js / Express API  │
│  React 19 + Vite │  REST  │  port 5000              │
│  port 5173 (80)  │        └───────┬─────────────────┘
└──────────────────┘                │
                        ┌───────────┴──────────┐
                        ▼                      ▼
             ┌────────────────────┐  ┌────────────────────┐
             │ Python ML service  │  │      MongoDB       │
             │ Flask  port 5001   │  │   port 27017       │
             │ (internal only)    │  │  (internal only)   │
             └────────────────────┘  └────────────────────┘
```

The backend is the only component that talks to MongoDB or to the ML service. Both of those are
bound to loopback and are not reachable from outside the host.

### Repository layout

```
AI_MARKETPLACE/
├── backend/
│   ├── server.js                 # bootstrap only: config → db → listen
│   ├── src/
│   │   ├── app.js                # express assembly (middleware, routes, errors)
│   │   ├── config/
│   │   │   ├── env.js            # validated configuration, fails fast
│   │   │   ├── db.js             # mongoose connection
│   │   │   ├── taxonomy.js       # ← CANONICAL CATEGORIES & CONDITIONS
│   │   │   └── cloudinary.js     # upload storage (optional)
│   │   ├── models/               # User, Product (+ schema enums and indexes)
│   │   ├── middleware/           # auth, rate limits, validation, error handler
│   │   ├── services/
│   │   │   ├── mlClient.js       # ← THE ONLY MODULE THAT KNOWS THE ML PROTOCOL
│   │   │   ├── fraudService.js   # analyze / cache / bulk backfill
│   │   │   └── productService.js # queries, filters, pagination, aggregates
│   │   ├── serializers/          # explicit response shapes (PII control)
│   │   ├── routes/               # one file per resource
│   │   └── utils/
│   ├── scripts/                  # seed, taxonomy migration, indexes, fraud backfill
│   └── tests/                    # jest + supertest, incl. the taxonomy contract test
│
├── ml_service/
│   ├── ml_server.py              # Flask; heuristics, to be replaced by trained models
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── lib/taxonomy.js       # ← MIRROR of the backend taxonomy (asserted by tests)
│       ├── api/                  # axios client + endpoint wrappers
│       ├── hooks/                # usePaginatedList, useDebouncedValue, useApi
│       ├── context/              # auth, theme, listings refresh
│       ├── components/           # ui/, layout/, marketplace/, ai/
│       └── pages/                # Marketplace, ProductDetails, Dashboard, Admin, auth
│
├── docker-compose.yml
├── nginx.conf                    # for the production frontend build (see Deployment)
└── README.md
```

---

## The data contract

Categories and conditions are declared **once**, in `backend/src/config/taxonomy.js`.

| Categories | Conditions |
|---|---|
| `electronics`, `textbooks`, `furniture`, `appliances`, `clothing`, `sports`, `other` | `new`, `like_new`, `good`, `fair`, `poor` |

Three consumers need this vocabulary and cannot import each other, so it is enforced rather than
trusted:

1. **Backend** — schema `enum`s plus request validation. An unknown value returns `400` naming the
   valid options; it is never coerced to a default.
2. **Frontend** — `frontend/src/lib/taxonomy.js` is a dependency-free mirror.
   `backend/tests/taxonomy.contract.test.js` fails if it diverges by so much as a label.
   In development the app also compares itself against `GET /api/meta/taxonomy` at boot and logs
   loudly on a mismatch.
3. **ML service** — `CATEGORY_BASE_PRICES` in `ml_server.py` must cover every category and
   condition (also asserted by the contract test). Off-taxonomy input returns `400
   TAXONOMY_MISMATCH` instead of falling back to `other` / `good`.

`GET /api/meta/taxonomy` publishes the vocabulary for any other client.

Legacy values (`like-new`) are accepted on write and normalized. To fix existing documents:

```bash
cd backend
npm run migrate:taxonomy            # dry run: reports what would change
npm run migrate:taxonomy -- --apply # write it
```

---

## Setup

### Docker (recommended)

```bash
cp backend/.env.example backend/.env
# JWT_SECRET is required and has no default — generate one:
openssl rand -base64 48

docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:5000/api |
| ML service | http://127.0.0.1:5001 (loopback only) |
| MongoDB | 127.0.0.1:27017 (loopback only) |

### Frontend → API routing

The SPA calls **`/api` on its own origin**. Both the Vite dev server
(`vite.config.js` → `server.proxy`) and `nginx.conf` proxy that to the backend, so the app works
under `http://localhost`, `http://marketplace.io` or any other hostname without reconfiguration.

Serving the app under an extra hostname therefore needs only that the hostname be allowed in two
places:

```yaml
# frontend/vite.config.js — hostnames the dev server answers for
server.allowedHosts: ['marketplace.io', 'localhost']

# docker-compose.yml — origins the API accepts (browsers send Origin on writes,
# and the proxy forwards it, so this is required even for same-origin requests)
CORS_ORIGINS=${CORS_ORIGINS:-http://marketplace.io,http://localhost,http://localhost:5173}
```

Override per deployment without editing the file: `CORS_ORIGINS=https://example.edu docker compose up -d`.

Set `VITE_API_BASE_URL` to an absolute URL only if the API genuinely lives on a different origin —
and add that origin to `CORS_ORIGINS` too. A hardcoded `http://localhost:5000` default is what
previously broke the app when it was opened as `http://marketplace.io`; a test now guards against
reintroducing one.

### Manual

```bash
# 1. MongoDB
mongod

# 2. ML service
cd ml_service && pip install -r requirements.txt && python ml_server.py

# 3. Backend
cd backend && npm install
cp .env.example .env      # then set JWT_SECRET
npm run indexes           # create the compound indexes
npm run seed              # optional: 420 demo listings + 20 accounts
npm run dev

# 4. Frontend
cd frontend && npm install
cp .env.example .env
npm run dev
```

Demo account created by the seed: **demo@college.edu.in** / **demo1234** (admin).

---

## API reference

All routes are prefixed with `/api`. Errors are always JSON:
`{ message, code?, errors?: [{ field, message }] }`.

### Platform

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/health` | — | Reports database and ML service reachability |
| GET | `/meta/taxonomy` | — | Canonical categories and conditions |
| GET | `/stats` | — | Public marketplace figures (no user counts) |

### Auth

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | `.edu.in` email, password ≥ 8 chars, mobile required |
| POST | `/auth/login` | — | 20 failed attempts / 15 min per IP |
| GET | `/auth/me` | JWT | |

### Products

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/products` | — | Paginated. `page`, `limit`≤100, `search`, `category`, `condition`, `minPrice`, `maxPrice`, `sort` |
| GET | `/products/me` | JWT | The caller's own listings, including sold |
| GET | `/products/:id` | optional | Seller contact details included **only** for signed-in callers |
| POST | `/products` | JWT | Fraud analysis runs after the response |
| PUT | `/products/:id` | JWT (owner/admin) | Editing content invalidates the cached fraud verdict |
| PATCH | `/products/:id/sell` | JWT (owner/admin) | |
| DELETE | `/products/:id` | JWT (owner/admin) | |
| GET | `/users/:userId/products` | — | A seller's public listings, no PII |
| POST | `/upload` | JWT | 5 MB, jpg/png/webp; `503` if Cloudinary is unconfigured |

List responses are `{ products: [...], pagination: { page, limit, total, pages, hasMore } }`.

### AI

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/ai/predict-price` | JWT | `{ title, description, category, condition }` |
| POST | `/ai/fraud-check` | JWT | Check a draft before publishing |
| GET | `/ai/fraud-check/:productId` | — | Cached verdict; computed once on a miss |
| GET | `/ai/recommendations/:productId` | — | Ranking cached for 60 s; degrades to `[]` if ML is down |
| GET | `/ai/insights` | — | Per-category aggregates over active listings |

### Admin

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/admin/stats` | Full figures including user counts |
| GET | `/admin/products` | Moderation list, paginated, `?flagged=true`. **Includes each listing's `aiFraud` verdict** |
| GET | `/admin/users` | Paginated |
| GET | `/admin/dashboard` | Products + first page of users |
| POST | `/admin/fraud/backfill` | Analyzes every listing without a verdict, batched |
| POST | `/admin/products/:id/reanalyze` | Forces a fresh verdict |
| DELETE | `/admin/users/:id` | Cannot delete yourself or the last admin |

---

## Security model

- **JWT secret** is required, must be ≥ 32 characters, and values previously committed to this
  repository are rejected outright. There is no fallback in any environment.
- **Writes are whitelisted.** Request bodies are never spread into a document, so `seller`,
  `views`, `isFlagged` and `aiFraud` cannot be set by a client. Availability
  (`status`/`isActive`/`isSold`) is derived from `quantity` by the model.
- **Seller contact details** never appear in list responses. They are returned on the single-product
  endpoint only, and only to authenticated callers.
- **CORS** is an explicit origin allowlist (`CORS_ORIGINS`); a disallowed origin gets `403`.
- **Rate limits**: 600/15 min overall, 20 failed logins, 10 registrations, 120 AI calls,
  100 writes, 40 uploads — per IP.
- **Search terms are regex-escaped** and length-capped.
- **Password hashes** are `select: false` and cannot be returned by an over-broad projection.
- **Token failures are always `401`** with a `code`, so the browser client can clear the session.
- MongoDB and the ML service are bound to `127.0.0.1`; neither is exposed off-host.

Not yet done: MongoDB runs without authentication (fine for loopback, not for a shared host), and
the frontend container still runs the Vite dev server rather than a built bundle.

---

## Testing

```bash
cd backend
npm test
```

51 tests over auth, taxonomy enforcement, mass assignment, PII redaction, ownership, pagination,
search escaping, ML-outage behaviour and admin access control — plus the three-way taxonomy contract
test. The suite uses a real `college_marketplace_test` database and points `ML_SERVICE_URL` at a
closed port on purpose, so it verifies that the marketplace keeps working when the ML service is
unavailable.

## Scripts

```bash
npm run seed                        # demo users + 420 listings, then batched fraud analysis
npm run migrate:taxonomy [-- --apply]
npm run indexes                     # create/refresh the compound indexes
npm run fraud:backfill [-- --limit N]
```

---

## Replacing the ML service

The current price, recommendation and fraud implementations are hand-written heuristics. Everything
the backend knows about them lives in `backend/src/services/mlClient.js`:

```js
predictPrice({ title, description, category, condition })  // → { predicted_price, price_range, ... }
recommend({ target, candidates, topN })                     // → [{ productId, score }]
fraudCheck({ product, sellerHistory })                      // → verdict | null
fraudCheckBatch([{ product, sellerHistory }])               // → Map<productId, verdict>
```

A replacement only has to satisfy those four functions and the shared taxonomy. Notably, `recommend`
returns a **ranking**, not products — candidates are already projected down to the eight fields a
scorer needs, and the caller re-reads the products it wants to render.

Known heuristic weaknesses, left deliberately for the rewrite rather than patched:

- The price model multiplies every matched keyword and clamps at 8×, so it saturates: adding more
  premium keywords stops changing the answer.
- The fraud check compares price against the raw category base price while the price model applies
  keyword multipliers, so premium-brand items get a spurious "unusually high" flag.
- `seller_history.report_count` is read by the model but nothing produces it — there is no reporting
  feature yet.

---

*Built as a college project demonstrating full-stack AI/ML integration.*
