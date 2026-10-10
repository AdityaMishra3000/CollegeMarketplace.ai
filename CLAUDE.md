# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A student buy-and-sell marketplace with AI price prediction, recommendations and fraud detection.
Three services: a React 19 + Vite SPA, an Express 4 + Mongoose 7 API, and a Flask ML microservice.

## Current architecture

```
browser ──▶ Vite dev server (:80 → :5173) ──┬──▶ /*     SPA
                                            └──▶ /api/* proxied to backend:5000
                                                          │
                                            ┌─────────────┴─────────────┐
                                            ▼                           ▼
                                  ml-service:5001                 mongo:27017
```

| Service | Container | Host binding | Notes |
|---|---|---|---|
| frontend | `college_frontend` | `0.0.0.0:80` → 5173 | Vite **dev** server, source bind-mounted |
| backend | `college_backend` | `0.0.0.0:5000` | `NODE_ENV=production` in compose |
| ml-service | `college_ml` | `127.0.0.1:5001` | loopback only, no auth |
| mongo | `college_mongo` | `127.0.0.1:27017` | loopback only, no auth |

Only the backend talks to MongoDB or the ML service. The SPA talks only to the backend.

Directories worth knowing before editing: `backend/src/{config,models,middleware,services,serializers,routes,utils}`,
`backend/scripts/`, `backend/tests/`, `frontend/src/{api,hooks,context,lib,components,pages}`.

## Development workflow

The development entrypoint is the **Vite dev server**, reached at `http://marketplace.io` or
`http://localhost`. `marketplace.io` is a local-only alias — `127.0.0.1 marketplace.io` in
`/etc/hosts`; it is not a published domain. For it to work it must be listed in **both**
`frontend/vite.config.js` → `server.allowedHosts` **and** the backend's `CORS_ORIGINS`.

`nginx.conf` exists for the **production** build (serve `dist/`, proxy `/api/` to `backend:5000`) but
is **not** wired into `docker-compose.yml` and is not the development entrypoint. There is no
frontend `Dockerfile`; the frontend service runs `npm install && npm run dev -- --host 0.0.0.0` in a
`node:22-alpine` image with `./frontend` bind-mounted, so editing frontend source hot-reloads with no
rebuild.

```bash
docker compose up --build                    # whole stack
docker compose up -d --build backend         # after backend or ml_service source changes
docker compose restart frontend              # rarely needed; HMR usually suffices
docker compose logs backend --tail 30
docker compose ps                            # backend/ml/mongo report healthchecks
```

Backend and ML changes need a container rebuild (their Dockerfiles `COPY` the source). Frontend
changes do not.

## Commands

```bash
# backend/
npm run dev                    # nodemon
npm start                      # node server.js
npm test                       # jest --runInBand; needs MongoDB on 127.0.0.1:27017
npx jest tests/api.test.js     # one file
npx jest -t "the legacy \"like-new\" alias is accepted and normalized to like_new"   # one test
npm run indexes                # syncIndexes() for every model — run after schema changes
npm run seed                   # 20 accounts + 420 listings (60 × 7 categories), then fraud backfill
npm run migrate:taxonomy       # dry run; `-- --apply` to write
npm run fraud:backfill         # `-- --limit N` optional

# frontend/
npm run dev
npm run build                  # vite build
npm run preview
npm run lint                   # oxlint
```

`backend`'s `npm run lint` / `lint:fix` are declared but **there is no eslint config file**, so they
error out. Either add a config or use them knowing they fail. `frontend`'s oxlint enforces only two
rules (`react/rules-of-hooks`, `react/only-export-components`) — pre-existing warnings about unused
catch parameters and non-component exports are expected noise.

There are **no frontend tests** and no test runner installed there. `npm run build` is the only
automated frontend check.

Test suite specifics: `tests/setEnv.js` runs before the modules under test, forcing
`NODE_ENV=test`, a `college_marketplace_test` database (dropped in `afterAll`), rate limits disabled,
and `ML_SERVICE_URL` pointed at a **closed port on purpose** so the suite proves the marketplace
still works when the ML service is down. Anything needing a real ML response must stub it. `jest.config.js`
pins `maxWorkers: 1` because the suite shares one database.

## Taxonomy: the single source of truth

`backend/src/config/taxonomy.js` defines the product vocabulary and nothing else may redeclare it:

- categories: `electronics, textbooks, furniture, appliances, clothing, sports, other`
- conditions: `new, like_new, good, fair, poor` (each with a `rank`, worst → best)

Three components consume it and cannot import each other:

| Consumer | Location |
|---|---|
| Backend (authority) | schema `enum`s, request validators, `GET /api/meta/taxonomy` |
| Frontend mirror | `frontend/src/lib/taxonomy.js` — must stay **import-free**; a test evaluates the file |
| ML service | `CATEGORY_BASE_PRICES` and `CONDITION_LADDER` in `ml_service/ml_server.py` |

**Rules:**

- Change all three in the same commit. `backend/tests/taxonomy.contract.test.js` fails on any
  divergence, including labels and condition ordering, and also asserts every ML category prices
  every condition.
- Never fall back to `other` / `good` for an unrecognised value. Reject it: the backend returns 400
  naming the valid values, the ML service returns 400 `TAXONOMY_MISMATCH`. Silent fallbacks are what
  previously mispriced every `appliances` listing and ignored every `like_new` condition.
- Legacy spellings go in `LEGACY_CONDITION_ALIASES` (currently `like-new`, `likenew` → `like_new`);
  they are normalized on write, never emitted. Convert stored data with `npm run migrate:taxonomy`.
- `frontend/src/lib/constants.js` composes the mirror with lucide icons. Icons are a frontend
  concern and are deliberately not part of the contract.

## ML boundary — what must not be modified

`ml_service/ml_server.py` is hand-written heuristics, explicitly temporary, to be replaced by trained
models. **Do not refactor, tune or "fix" the scoring maths.** Two known defects are documented in the
README and left in deliberately:

- the price model multiplies every matched keyword and clamps at 8×, so it saturates
- the fraud check compares price against the raw category base price while the price model applies
  keyword multipliers, so premium-brand items get a spurious "unusually high" flag

`seller_history.report_count` is read by the fraud model but nothing produces it — there is no
reporting feature.

`backend/src/services/mlClient.js` is the **only** module that knows the ML URL, wire format or field
names. Routes never build ML payloads. Its surface:

```js
predictPrice({ title, description, category, condition })
recommend({ target, candidates, topN })        // → [{ productId, score }] — a ranking, not products
fraudCheck({ product, sellerHistory })         // → verdict | null
fraudCheckBatch([{ product, sellerHistory }])  // → Map<productId, verdict>
health()                                       // never throws
```

Every failure becomes `ApiError.unavailable` (503) with a `code` of `ML_UNAVAILABLE`,
`ML_BAD_RESPONSE` or `ML_REJECTED`. Timeouts come from `ML_TIMEOUT_MS` /
`ML_RECOMMEND_TIMEOUT_MS` via `AbortSignal.timeout`. Acceptable changes to `ml_server.py`: the shared
vocabulary, request/response shape, input validation, guard rails. Nothing else.

## Backend architecture and conventions

`server.js` is bootstrap only: validate config → connect → sync indexes (non-production) → listen →
handle SIGTERM/SIGINT. `src/app.js` assembles the Express app and is what tests mount with supertest,
so no port is bound during tests.

Four invariants hold across every route:

1. **Writes are whitelisted.** Never spread `req.body` into a document. Routes call
   `pick(req.body, WRITABLE_FIELDS)` from `src/utils/helpers.js`. `seller`, `views`, `isFlagged`,
   `aiFraud` and `role` are not client-writable.
2. **Responses go through `src/serializers/`.** Never return a raw document or a populated query
   result. `productCard` (all lists) omits contact details for everyone; `productDetail(p, { viewer })`
   adds seller email/phone only for an authenticated viewer; `adminProduct` adds email for moderation.
3. **Updates are load → assign → `save()`**, not `findByIdAndUpdate`, so validators and hooks run.
4. **Derived state is computed in one place.** A `pre('validate')` hook on `Product` derives
   `status` / `isActive` / `isSold` from `quantity`. Never set them by hand.

Handlers are wrapped in `asyncHandler` and throw `ApiError` (`badRequest`, `unauthorized`, `forbidden`,
`notFound`, `conflict`, `unavailable`). `src/middleware/errorHandler.js` owns the response shape and
maps Mongoose `ValidationError`, `CastError`, duplicate-key and `MulterError`. An `ApiError` is
"expected" even at 5xx — a 503 for "ML is down" is logged as a warning, not as a bug; anything else at
5xx is logged in full and reported generically.

Validation lives in `src/middleware/validate.js` as named express-validator chains
(`validate.createProduct`, `validate.listProducts`, …), each terminated by `runValidation`. Compose a
new chain there rather than validating inline in a route.

## API conventions

Everything is under `/api`. Route files live in `src/routes/*.routes.js`, mounted by
`src/routes/index.js`.

- **List responses**: `{ products: [...], pagination: { page, limit, total, pages, hasMore } }`.
  Query params `page`, `limit` (max 100, default 24), plus `search`, `category`, `condition`,
  `minPrice`, `maxPrice`, `sort` (`newest|oldest|price_asc|price_desc|popular`). `all` and `''` are the
  documented "no filter" sentinels and are erased by the validator.
- **Errors**: `{ message, code?, errors?: [{ field, message }] }`. `message` is what the browser client
  reads, so keep it.
- **Auth**: `Authorization: Bearer <jwt>`. Every token failure is **401** with a `code`
  (`NO_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `NO_USER`) so the client can clear the session; 403 is
  reserved for a real permission denial. Use `authenticate`, `optionalAuthenticate` (widens a public
  response for signed-in callers) or `requireAdmin` from `src/middleware/auth.js`.
- **Single-resource responses** are returned bare (e.g. `GET /api/products/:id` → the product);
  `PUT /api/products/:id` returns `{ product }`; mark-as-sold returns `{ message, product }`. These
  shapes are consumed by the SPA — check `frontend/src/api/` before changing one.
- `GET /api/health` reports database and ML reachability. `GET /api/meta/taxonomy` publishes the
  vocabulary. `GET /api/stats` is public and deliberately narrower than `GET /api/admin/stats`
  (no user counts).

## MongoDB conventions

- Models live in `src/models/`, both with `versionKey: false`. `category` and `condition` carry
  `enum`s from the taxonomy; `aiFraud` is an embedded sub-schema with `_id: false`.
- `User.password` is `select: false`. Login must opt in with `.select('+password')`; compare via
  `user.verifyPassword(candidate)`. Hashing happens in a `pre('save')` hook, so never pass a
  pre-hashed password to `User.create` (that double-hashes it).
- Reads that feed serializers use `.lean()` and an explicit `.select()` — see
  `productService.CARD_FIELDS`. Query building, sorting and pagination belong in
  `src/services/productService.js`, not in route handlers.
- **Indexes are declared on the schema but created by an explicit operation.** `server.js` only
  auto-syncs outside production; run `npm run indexes` against the target database after a schema
  change. `Product` needs *two* listing indexes, not one: with `category` sitting between the equality
  keys and the sort key, `{isActive, isSold, category, createdAt}` can only serve the sort when a
  category is actually supplied, so `{isActive, isSold, createdAt}` exists for the unfiltered list.
- Search is an escaped case-insensitive `$regex` over title and description. It cannot use an index
  and is a deliberate collection scan at current data size; it is bounded by an 80-character cap and
  frontend debouncing. Do not interpolate a raw term into a regex — use `escapeRegex`.
- Aggregations: `productService.statistics()` uses a single `$facet` pass; `categoryInsights()` covers
  active listings only.

## Security rules

- **`JWT_SECRET` has no default in any environment.** `src/config/env.js` throws at boot if it is
  missing, shorter than 32 characters, or one of the values previously committed to this repository
  (they are refused by name). Never add a fallback.
- **CORS is an explicit allowlist**, never `*`. `CORS_ORIGINS` is required when
  `NODE_ENV=production`; a rejected origin gets 403 `CORS_DENIED` and is logged with the current
  allowlist. Requests with no `Origin` header (same-origin GET, curl, server-to-server) are allowed.
- **Contact details are gated.** Seller email and phone never appear in any list response, for any
  caller. They appear only on `GET /api/products/:id`, only for an authenticated viewer, and in admin
  responses. Adding a `populate('seller', ...)` does not expose them — the serializer decides.
- **Rate limits** are in `src/middleware/rateLimit.js` and disabled under `NODE_ENV=test`: 600/15 min
  overall, 20 failed logins (successes are not counted), 10 registrations, 120 AI calls, 100 writes,
  40 uploads.
- Login returns one message for both "no such account" and "wrong password" to prevent enumeration.
- JSON bodies are capped at 256 kb; uploads at 5 MB with a MIME allowlist, and `POST /api/upload`
  returns 503 when Cloudinary credentials are absent rather than silently using placeholders.
- `jwt.verify` pins `algorithms: ['HS256']`.
- `app.set('trust proxy', TRUST_PROXY_HOPS)` (default 1) so rate limiting sees real client IPs behind
  the proxy. The Vite proxy sets `xfwd: true` and `nginx.conf` sets `X-Forwarded-For` for the same
  reason — Express reads `X-Forwarded-For`, not `X-Real-IP`.

## Frontend architecture and conventions

- **The SPA calls `/api` on its own origin.** `src/api/client.js` defaults `baseURL` to `/api`; both
  the Vite dev proxy and nginx route it to the backend, so the app works under any hostname. Do not
  reintroduce an absolute default — `backend/tests/taxonomy.contract.test.js` guards it. Set
  `VITE_API_BASE_URL` to an absolute URL only if the API truly lives elsewhere, and add that origin to
  `CORS_ORIGINS`.
- **All HTTP goes through `src/api/`.** `client.js` owns the axios instance: a request interceptor
  attaches the JWT from `localStorage`, and a response interceptor **unwraps `res.data`** — so callers
  receive the payload directly, never an axios response. On a session failure it clears the token and
  redirects to `/login`. Endpoint wrappers live in `api/products.js` and `api/ai.js`; list wrappers
  normalize the API envelope into `{ items, pagination }` for the pagination hook.
- **Three data-fetching hooks.** `usePaginatedList(fetchPage, deps)` for `{ items, pagination }` lists
  (Marketplace, Dashboard, Admin) — returns `items/loading/loadingMore/error/hasMore/total/loadMore/refresh`
  and uses a monotonic request id to discard out-of-order responses. `useApi(fetcher, deps)` for single
  resources. `useDebouncedValue(value, ms)` for the search box.
- **Never fetch per list row.** Fraud verdicts arrive on each product as `product.aiFraud`; read that.
  The admin table previously issued one fraud request per row.
- Providers nest in `main.jsx` as `StrictMode → BrowserRouter → ToastProvider → AuthProvider →
  ThemeProvider → App`; `App` adds `ListingsProvider`. Creating a listing calls
  `ListingsContext.refreshListings()`, which bumps a `version` that list pages include in their fetch
  deps — no page reload.
- `main.jsx` runs `verifyTaxonomy()` in dev only, logging loudly if the mirror has drifted from the
  backend it is talking to.
- Auth state is in `AuthContext`; the token lives in `localStorage`. `ProtectedRoute` in `App.jsx`
  waits on `loading` before redirecting so the login screen does not flash.
- `/` renders the landing page for visitors and redirects signed-in users to `/marketplace`.
  Route-protected pages are `/dashboard` and `/admin` (the latter `requireAdmin`). There is no
  `/profile` route — do not link to one.
- The landing page opts out of the app's page container (`AppShell` checks `pathname === '/'`) and
  composes full-bleed sections from `components/landing/`. Its figures come from the existing public
  `GET /api/stats`, `GET /api/products` and `GET /api/ai/insights` — never mock data.

## Design system and UI conventions

Tailwind v4 via `@tailwindcss/vite`, driven entirely by tokens in `src/index.css`. Extend that token
layer; never scatter hex values through JSX.

**Brand: `#FF8000` = `oklch(0.732 0.186 53)`.** Light mode is a white field with warm neutrals
(hue ~55, tiny chroma); orange marks interaction, brand and state only. Three separate orange
concepts exist because one cannot do the job — `scripts/contrast-audit.mjs` proves it:

| Token | Use | Why |
|---|---|---|
| `--primary` | the fill | #FF8000 exactly |
| `--primary-foreground` | ink **on** the fill | white on #FF8000 is **2.52:1 and fails AA**; this is warm near-black at 7.22:1 |
| `--primary-ink` | orange **as text** | 5.25:1 on white — `text-primary` would fail at any size |

The primary button also carries a `--primary-active` border: the fill itself is only 2.52:1 against
white, so the border is what gives the control a WCAG 1.4.11-compliant boundary. `--input` is
deliberately darker than `--border` for the same reason (form-control boundaries need 3:1; decorative
dividers do not). Dark mode keeps the same hue, lifts L, and puts dark ink on both the orange and the
danger fill.

Run `node scripts/contrast-audit.mjs` after any token change — it parses the real `:root`/`.dark`
blocks and checks 19 pairs per theme. It must exit 0.

**Type is a two-face system.** `--font-display` is Spongeboy (`public/SpongeboyRegulargx2n6.otf`,
`@font-face` in index.css, preloaded in index.html) for the wordmark, hero, page/section titles and
large numerals. `--font-sans` is Inter for everything readable. Rules:

- Spongeboy has **203 glyphs and no `₹` (U+20B9)**, so a price set in the display face silently falls
  back for that one character and renders at a different weight. Always use `<Price>` from
  `ui/Editorial.jsx`, which sets the symbol in the sans face, optically centred.
- Its letterforms are bulbous and wide, so the display sizes carry **zero-to-positive tracking**, not
  the usual negative. `--text-hero` is capped at 6.5rem; larger forces mid-phrase wrapping.
- Never use it for body copy, form labels or table cells.

**Scales are redefined, not added to.** `--radius-*` (tight: `rounded-lg` is 6px) and `--shadow-*`
(warm-tinted) are overridden in `@theme inline`, so changing them re-skins every existing utility.
Named z-index utilities (`z-nav`, `z-dropdown`, `z-overlay`, `z-modal`, `z-toast`, `z-palette`)
replace the old ad-hoc `z-[60]`/`z-[70]` ladder.

**Motion lives in `src/lib/motion.js`** — four patterns reused everywhere (reveal, press, overlay,
image) plus `useMotion()`, which collapses distance and duration under `prefers-reduced-motion`.
Import from there rather than writing new transitions. Button press feedback is CSS, not Framer
Motion, so it behaves identically when `asChild` renders a `<Link>`.

**Primitives in `src/components/ui/`.** `Button` (`primary|ink|secondary|outline|ghost|danger|link`),
`Card`, `Badge`, `Input`/`Textarea`/`Select`/`Label`/`Field` (Field wires `aria-describedby` and
`aria-invalid`), `Modal`, `Toast`, `Avatar`, `States` (`Skeleton`/`CardGridSkeleton`/`EmptyState`/
`ErrorState`/`Spinner`), plus the editorial layer: `Editorial.jsx` (`Eyebrow`, `Display`, `Rule`,
`Price`, `PageHeader`, `StatNumber`, `Stat`), `Reveal.jsx` (`Reveal`/`RevealGroup`/`RevealItem`) and
`ImageFrame.jsx`. Reach for these before writing markup; **every image goes through `ImageFrame`**,
which declares its aspect ratio and takes a `fallback` node — most seeded listings have no photo, so
the card renders a typographic category tile instead of a grey box.

`Modal` and `CommandPalette` both use `hooks/useDismissable.js` for Escape, scroll lock, focus trap
and focus restore, so they cannot drift apart.

**One focus language:** the global `:focus-visible` outline in `index.css`. Do not add `outline-none`
plus a `ring-*` to a component — that was two competing treatments, and it silently produced no
visible indicator on `Button`.

Theme switching is class-based via `ThemeContext` (persists to `localStorage` under
`campusmarket-theme`, falls back to `prefers-color-scheme`), with an inline script in `index.html`
that applies the class before first paint. `@custom-variant dark` **is** declared, so `dark:`
utilities follow the class — but prefer tokens over `dark:` variants.

## Debugging procedures

Work outward from the layer that can be observed. Recipes that have actually been needed here:

```bash
# Is the stack healthy, and which dependency is down?
docker compose ps                                    # healthchecks for backend/ml/mongo
curl -s http://localhost:5000/api/health | python3 -m json.tool

# Reproduce what the browser does, including the origin header
curl -s -o /dev/null -w '%{http_code}\n' -H 'Origin: http://marketplace.io' \
  'http://marketplace.io/api/products?page=1&limit=24'

# A 403 on an API call is almost always CORS. The backend names the fix:
docker compose logs backend | grep '\[cors\] rejected'

# Inspect the live database without mongosh
cd backend && node -e "require('./src/config/db').connect().then(async()=>{ \
  const {Product}=require('./src/models/Product'); console.log(await Product.countDocuments()); \
  process.exit(0)})"

# Is a query using an index? explain() through the real filter builder
# (productService.buildListFilter + sortSpec, then .explain('executionStats'))
```

- **Spinner forever, 200 in the network tab, clean console** → a state guard in a hook, not the API.
  `<React.StrictMode>` is on and React 19 double-invokes mount effects (setup → cleanup → setup); a
  ref cleared only in a cleanup stays cleared for the component's whole life. This exact bug made every
  list page hang. Prefer a local `let` flag re-initialised inside the effect, or a monotonic request
  id, over an `isMounted` ref.
- **A change to the frontend appears not to apply** → check what the dev server is actually serving:
  `curl -s http://marketplace.io/src/hooks/usePaginatedList.js | head`. Vite falls back to
  `index.html` for unknown paths, so a 200 does not prove a module exists — check `Content-Type`.
  After hot-swapping a hook, hard-refresh rather than trusting HMR.
- **A config change appears to be ignored** → the compose `environment:` block **overrides**
  `env_file:`. Confirm what the process sees: `docker compose exec backend printenv CORS_ORIGINS`.
- **400 from a write** → read `errors[]` in the response body; it names the field. Off-taxonomy
  category/condition values are rejected by design.
- **Product counts look off by one or two** → the marketplace lists `isActive && !isSold`;
  `/api/admin/stats` reports `totalProducts`, `totalItems` and `totalSales` separately and they
  reconcile.

## Deployment details

- `docker-compose.yml` is the only orchestration. Mongo and the ML service are bound to `127.0.0.1`;
  only the frontend (`:80`) and backend (`:5000`) are exposed off-host.
- `CORS_ORIGINS` uses compose interpolation, so a deployment can override it without editing the file:
  `CORS_ORIGINS=https://example.edu docker compose up -d`. `MONGODB_URI`, `ML_SERVICE_URL` and
  `NODE_ENV` are intentionally set in the compose `environment:` block because they must be the
  container-internal values. Everything else belongs in `backend/.env` (gitignored;
  `backend/.env.example` documents every variable).
- The compose backend runs with `NODE_ENV=production`, which means index syncing is skipped at boot —
  run `npm run indexes` after schema changes.
- `frontend/vercel.json` rewrites everything to `/index.html` for SPA routing on Vercel. A Vercel
  deployment would need an absolute `VITE_API_BASE_URL` plus that origin in `CORS_ORIGINS`.
- `ml_service/Dockerfile` runs `python ml_server.py` — Flask's development server. Its healthcheck uses
  `urllib` because `python:3.11-slim` has no `curl`.
- Lock files exist for both packages and are **no longer gitignored** (they are currently untracked —
  commit them). This is an application, so builds should be reproducible; prefer `npm ci`.

## Known technical debt

Documented so it is not rediscovered or "fixed" accidentally.

- **The frontend is served by the Vite dev server in every environment.** No production build, no
  minification, `npm install` on every container start, and `nginx.conf` unused. A two-stage frontend
  Dockerfile (`vite build` → nginx serving `dist/`) is the outstanding change.
- **MongoDB has no authentication.** Acceptable only because it is bound to `127.0.0.1`. Enabling it
  needs care: `MONGO_INITDB_ROOT_USERNAME` only applies to an empty data volume.
- **Backend eslint is unconfigured** while `eslint`/`prettier`/`eslint-config-prettier` sit in
  devDependencies.
- **No frontend test runner.** Locking in frontend behaviour needs vitest + jsdom +
  @testing-library/react, which is not installed.
- **`npm audit`**: express 4.22.2 pulls vulnerable `qs`/`body-parser`; the only fix is express 5
  (breaking). `multer@1.4.5-lts.2` has 2025 DoS advisories but `multer-storage-cloudinary@4`
  peer-depends on multer 1.x, so upgrading breaks the upload path. Both left deliberately.
- **`chart.js` and `react-chartjs-2` are declared in `frontend/package.json` but referenced nowhere.**
- **Only 4 of the 8 files in `frontend/public/landing/` are photographs.** `cyber_club`,
  `devops_club` and `I.T._department` are designed committee posters carrying their own branding and
  ~60 named students' headshots; `hackathon` is a 5-panel collage. The landing composition uses
  `cricket`, `Football`, `class` and `Tennis` only — do not force the others in.
- **API wrappers with no UI**: `getMarketInsights`, `checkFraudDraft`, `reanalyzeProduct`,
  `getSellerProducts`, `updateProduct`, `checkFraudById`. The endpoints exist and work; nothing calls
  them. `PUT /api/products/:id` in particular has no edit form.
- **20 legacy accounts** in the live database use `@college.edu`, which the current `.edu.in` schema
  rule would reject on write. They still sign in and are left alone on purpose — rewriting them breaks
  known demo credentials. `npm run seed` replaces them with `demo@college.edu.in` / `demo1234`, but it
  **wipes all users**, so run it against a scratch database unless that is the intent.
- **Search is an unindexed collection scan** (see MongoDB conventions). Fine at current size; a text
  index is the next step but changes matching semantics (`$text` will not match partial words).
- `backend/.env` contains a `DATABASE_URL` key left over from a removed `pg` dependency.
- **`.claude/skills/frontend-design/` is mis-filed.** `SKILL.md` — the file Claude Code actually
  loads — carries `name: light-ripple` and describes a Three.js WebGL shader background for a
  **Next.js + TypeScript + shadcn** project. The intended design guidance is in the sibling
  `anthropicSkill.md` (`name: frontend-design`). So asking for "the frontend-design skill" loads the
  wrong thing, and following it would add a `three` dependency and an animated shader hero to a
  Vite + plain-JS app. Read `anthropicSkill.md` directly, or swap the two files.

## Session checkpoint — 2026-09-06

**Committed** (`ed18bb7`): the whole backend restructure and the frontend/backend contract work —
`backend/src/**`, the taxonomy source of truth, serializers, validators, rate limits, pagination and
indexes, the ML boundary changes, `nginx.conf`, `vite.config.js`, and the first-pass frontend fixes
(pagination hooks, `ListingsContext`, taxonomy mirror, `usePaginatedList`).

**Uncommitted in the working tree**: the frontend visual rework — 24 modified files plus 9 new paths
(`src/lib/motion.js`, `src/hooks/useDismissable.js`, `src/components/ui/{Editorial,ImageFrame,Reveal}.jsx`,
`src/components/layout/AuthLayout.jsx`, `src/components/landing/`, `src/pages/Landing.jsx`,
`frontend/scripts/`). Nothing under `backend/` or `ml_service/` is modified. **Do not re-do this work;
it is on disk, just not committed.**

Verified at checkpoint: `vite build` clean, `node frontend/scripts/contrast-audit.mjs` exits 0
(38 token pairs across both themes), backend `npx jest` 52/52, all four containers healthy, and
`/`, `/marketplace`, `/api/health` all 200 through `http://marketplace.io`.

### Open design questions (not bugs)

The intended design guidance in `.claude/skills/frontend-design/anthropicSkill.md` names several
"tells of a generated page". The current landing and app surfaces use four of them, and each was a
deliberate choice worth re-examining rather than a defect:

1. **A single accented word in the headline** — "NEED" sits in an orange highlight block. It is the
   filled-block variant rather than coloured text (orange *cannot* be display text at 2.52:1), but
   it is the same move the guidance warns against.
2. **All-caps tracked-out eyebrow labels above almost every heading** — the `.eyebrow` utility and
   `PageHeader`'s `eyebrow` prop are used on every page and landing section.
3. **Meta strings joined by separators** — `ELECTRONICS │ LIKE NEW` on cards and list rows.
4. **Fade-and-slide-up reveals per section, plus a hover lift on every card** — the guidance calls
   for one orchestrated moment instead of scattered entrances.

The hero's own 01/02/03 numerals are fine: that content genuinely is a sequence.

### Recommended next step

**Commit the frontend rework first** — it is a large, verified, self-contained change and losing it
to an accident would be expensive:

```bash
git add -A frontend/ CLAUDE.md && git commit
```

Then, in priority order: (1) decide the four design questions above — the cheapest high-impact edit
is cutting eyebrow labels back to where they carry real information rather than appearing above every
heading; (2) ship a real frontend build (two-stage Dockerfile → nginx serving `dist/`), which is the
largest remaining gap between this repo and a deployable app; (3) add vitest + jsdom so the visual
work has a regression net, since `vite build` is currently the only automated frontend check.

