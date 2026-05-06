# PropertySmart — Backend API

Express 5 REST API powering the PropertySmart real estate marketplace. Handles authentication with a dual cookie + Bearer token strategy, property CRUD with Cloudinary image hosting, Stripe payments, Neon PostgreSQL via Prisma, and deploys as a Vercel serverless function.

---

## Stack

| | |
|---|---|
| **Runtime** | Node.js 20 · TypeScript 5 |
| **Framework** | Express 5 |
| **ORM** | Prisma 5 |
| **Database** | Neon PostgreSQL (serverless, pooler endpoint) |
| **Auth** | JWT httpOnly cookies + `Authorization: Bearer` header · bcryptjs |
| **File uploads** | Multer (memory storage, 5 MB) → Cloudinary |
| **Payments** | Stripe |
| **Validation** | Zod |
| **Deployment** | Vercel serverless (`api/index.ts`) |

---

## Project Structure

```
property-backend/
├── api/
│   └── index.ts                Vercel serverless entry — imports app, exports as default
├── prisma/
│   └── schema.prisma           Models + enums
├── vercel.json                 Routes all traffic to api/index.ts
└── src/
    ├── config/
    │   └── index.ts            Single typed config object — reads all env vars
    ├── lib/
    │   ├── prisma.ts           Singleton PrismaClient (cached on globalThis in dev)
    │   ├── cloudinary.ts       uploadImage(buffer, folder) · deleteImage(publicId)
    │   └── seed.ts             Demo users + Bangladesh properties (safe to re-run)
    ├── middlewares/
    │   ├── auth.middleware.ts  authenticate · authorize(...roles)
    │   ├── validate.middleware.ts  validate(zodSchema, source?) — 422 on failure
    │   ├── upload.middleware.ts    Multer: memory storage · 5 MB · images only
    │   └── error.middleware.ts    notFound (404) · errorHandler (converts ApiError → JSON)
    ├── modules/
    │   ├── auth/
    │   │   ├── auth.routes.ts
    │   │   ├── auth.controller.ts
    │   │   ├── auth.service.ts
    │   │   └── auth.schema.ts
    │   ├── user/               profile · password · avatar · favorites · admin user mgmt
    │   ├── property/           CRUD · search · filters · image management · stats
    │   ├── booking/            create · list (buyer/agent/admin) · status transitions
    │   ├── payment/            Stripe intent · webhook · history · stats
    │   └── review/             nested under /properties/:propertyId/reviews
    ├── utils/
    │   ├── ApiError.ts         class ApiError extends Error { statusCode; errors? }
    │   ├── ApiResponse.ts      new ApiResponse(status, data, message)
    │   ├── asyncHandler.ts     (fn) => (req, res, next) => fn(req,res,next).catch(next)
    │   └── jwt.ts              signAccessToken · signRefreshToken · verify helpers
    │                           cookieOptions · refreshCookieOptions (env-aware sameSite)
    ├── app.ts                  Express setup: CORS · body parsing · routes · error handlers
    └── server.ts               Local dev only — app.listen, DB connect, SIGTERM handler
```

---

## Setup

### 1 — Install

Run from the **repo root** (npm workspaces):

```bash
npm install
```

### 2 — Environment

```bash
cp .env.example .env
```

```env
# ── Database ──────────────────────────────────────────────────────────────
# Use the Neon -pooler endpoint. Adding connection params prevents "Closed" errors.
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require&channel_binding=require&connect_timeout=15&pool_timeout=15&connection_limit=5"

# ── Server ─────────────────────────────────────────────────────────────────
PORT=5000
# MUST be 'development' locally — 'production' disables the Prisma singleton
# and hot-reload creates new DB connections on every file change.
NODE_ENV=development

# ── JWT ───────────────────────────────────────────────────────────────────
JWT_SECRET=at_least_32_random_characters_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=different_32_random_characters_here
JWT_REFRESH_EXPIRES_IN=30d

# ── CORS ──────────────────────────────────────────────────────────────────
# No trailing slash — browsers send Origin without one.
CLIENT_URL=http://localhost:3000

# ── Cloudinary ────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# ── Stripe ────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 3 — Database

```bash
npm run db:push      # push schema to Neon (no migration files created)
npm run db:generate  # regenerate Prisma client
npm run db:seed      # seed demo accounts + Bangladesh sample properties
```

### 4 — Run

```bash
npm run dev    # tsx watch — hot reload on :5000
```

---

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `tsx watch src/server.ts` | Hot-reload development server |
| `build` | `tsc` | Compile TypeScript → `dist/` |
| `start` | `node dist/server.js` | Run compiled output |
| `db:push` | `prisma db push` | Sync schema to DB without migration history |
| `db:migrate` | `prisma migrate dev` | Create migration files |
| `db:generate` | `prisma generate` | Regenerate Prisma client after schema changes |
| `db:seed` | `tsx src/lib/seed.ts` | Seed demo data (safe to re-run) |
| `db:studio` | `prisma studio` | Open Prisma Studio at localhost:5555 |
| `lint` | `eslint src --ext .ts` | Lint TypeScript source |
| `postinstall` | `prisma generate` | Auto-runs on Vercel after `npm install` |

---

## Request Lifecycle

```
HTTP Request
  → Express Router
  → validate(zodSchema)          parse + coerce req.body or req.query (422 on failure)
  → authenticate                 read token from cookie → Authorization header → 401
  → authorize('ROLE', ...)       role check → 403
  → controller                   thin: parse params, call service, return ApiResponse
  → service                      business logic + Prisma queries
  → Prisma → Neon PostgreSQL
```

Errors anywhere in the chain: `throw new ApiError(statusCode, message)` → caught by `errorHandler` → JSON `{ success: false, message, errors? }`.

---

## Authentication

### Dual auth strategy

The backend accepts tokens via **two channels** in priority order:

1. **`req.cookies.accessToken`** — httpOnly cookie (works on same-origin / localhost via Next.js proxy)
2. **`req.headers.authorization`** — `Bearer <token>` header (works cross-origin on Vercel, bypasses third-party cookie restrictions)

```typescript
// auth.middleware.ts
const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
```

### Token response

Login, register, and refresh all return tokens in **both** cookies **and** the JSON body:

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

The frontend stores these in `localStorage` and sends them as `Authorization: Bearer` headers. This is the reliable path in production where cross-origin cookies are blocked by browsers.

### Cookie flags

| `NODE_ENV` | `secure` | `sameSite` |
|---|---|---|
| `development` | `false` | `lax` |
| `production` | `true` | `none` |

`sameSite: none` requires `secure: true` (HTTPS). Vercel provides HTTPS automatically.

### Refresh flow

`POST /auth/refresh` reads the refresh token from:
1. `req.cookies.refreshToken` (cookie path)
2. `req.body.refreshToken` (body path — used when cookies are blocked cross-origin)

### Logout

`clearCookie` must use the **same** `sameSite`/`secure` flags the cookie was set with, otherwise browsers silently ignore the clear instruction.

---

## CORS

```typescript
const allowedOrigins = [
  config.clientUrl,           // CLIENT_URL env var
  'http://localhost:3000',
  'http://localhost:3001',
];

origin: (origin, callback) => {
  if (!origin) return callback(null, true);          // server-to-server / curl
  if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))
    return callback(null, true);                     // Vercel preview deployments
  callback(new Error(`CORS: ${origin} not allowed`));
}
```

---

## API Routes

All routes prefixed `/api/v1`.

### Auth — `/auth`

```
POST   /register     { name, email, password, role? }
                     → 201 { user, accessToken, refreshToken } + cookies
POST   /login        { email, password }
                     → 200 { user, accessToken, refreshToken } + cookies
POST   /logout       (authenticate) → clears cookies, invalidates refresh token
POST   /refresh      { refreshToken? } or via cookie
                     → 200 { accessToken, refreshToken } + cookies
GET    /me           (authenticate) → current user profile
GET    /oauth/:provider/callback  → mock OAuth, sets cookies, redirects
```

### Properties — `/properties`

```
GET    /             Public. Filter params: type, status, city, state, minPrice, maxPrice,
                     minBedrooms, minBathrooms, minArea, maxArea, search, isFeatured,
                     agentId, sortBy, sortOrder, page, limit
GET    /featured     Public. Returns up to 6 isFeatured=true, status=AVAILABLE properties
GET    /stats        Admin. Total, available, pending, sold counts + recent
GET    /my           Agent/Admin. Agent's own listings with pagination
GET    /:id          Public. Increments viewCount. Includes agent, reviews, counts
POST   /             Agent/Admin. multipart/form-data. Up to 10 images.
                     All numeric/boolean fields are coerced from form strings.
PATCH  /:id          Agent/Admin. multipart/form-data. All fields optional.
DELETE /:id          Agent/Admin. Deletes property + Cloudinary images
DELETE /:id/images   Agent/Admin. { imageUrl } — removes one image from Cloudinary + DB
```

### Bookings — `/bookings`

```
POST   /             Buyer.  { propertyId, date, timeSlot, notes? }
GET    /my           Buyer.  Buyer's bookings, paginated
GET    /agent        Agent.  Bookings for agent's properties
GET    /admin        Admin.  All bookings
PATCH  /:id          Agent/Buyer. { status: CONFIRMED | COMPLETED | CANCELLED }
```

### Payments — `/payments`

```
POST   /intent       Buyer.  { propertyId, amount } → Stripe PaymentIntent
GET    /my           Buyer.  Buyer's payment history, paginated
GET    /             Admin.  All payments, paginated
GET    /stats        Admin.  Revenue totals, counts by status
POST   /webhook      No JSON middleware — raw body for Stripe signature verification
```

### Users — `/users`

```
GET    /profile              (authenticate) own profile
PATCH  /profile              (authenticate) { name?, phone?, bio? }
PATCH  /password             (authenticate) { currentPassword, newPassword }
POST   /avatar               (authenticate) multipart/form-data, single image
GET    /favorites            Buyer. Array of { id, propertyId, property }
POST   /favorites/:propertyId  Buyer. Toggle — creates if absent, deletes if present
GET    /                     Admin. { search?, role?, page?, limit? }
PATCH  /:id/role             Admin. { role: BUYER | AGENT | ADMIN }
PATCH  /:id/status           Admin. Toggles isActive
```

### Reviews — `/properties/:propertyId/reviews`

```
GET    /             Public. Property reviews with user info
POST   /             Buyer. { rating: 1-5, comment }
DELETE /:id          Buyer (own review) or Admin
```

### Health

```
GET    /        → { status: "ok", message: "PropertySmart API", version: "1.0.0" }
GET    /health  → { status: "ok", timestamp: "ISO string" }
```

---

## Validation Notes

Property create/update uses `multipart/form-data`, so all text fields arrive as strings. The Zod schema uses `z.coerce` for numeric fields and `z.preprocess` for booleans and arrays:

```typescript
price:      z.coerce.number().positive()
bedrooms:   z.coerce.number().int().min(0).default(0)
isFeatured: z.preprocess(v => v === 'true' || v === true, z.boolean()).default(false)
features:   z.preprocess(v => Array.isArray(v) ? v : v ? [v] : [], z.array(z.string()))
```

---

## File Uploads

- **Middleware:** `upload.middleware.ts` — Multer memory storage, 5 MB limit, `image/jpeg` + `image/png` + `image/webp` only
- **Storage:** Cloudinary via `lib/cloudinary.ts`
  - `uploadImage(buffer, folder)` — uploads and returns `{ url, publicId }`
  - `deleteImage(publicId)` — removes from Cloudinary
- **Folders:** `'properties'` for listing images · `'property-smart'` for avatars
- **Limits:** Up to 10 images per property · 1 avatar per user

---

## Vercel Deployment

### How it works

```
api/index.ts  →  imports Express app  →  exports as default
vercel.json   →  { "src": "api/index.ts", "use": "@vercel/node" }
              →  routes all /* to api/index.ts
```

`@vercel/node` compiles TypeScript directly — no `tsc` build step needed on Vercel.

The `postinstall` script (`prisma generate`) runs automatically after every `npm install`, keeping the Prisma client in sync with the schema even with Vercel's dependency caching.

### Required environment variables

```
DATABASE_URL        Use the -pooler Neon endpoint with connection params
NODE_ENV            production
JWT_SECRET          min 32 chars
JWT_REFRESH_SECRET  min 32 chars (different from JWT_SECRET)
CLIENT_URL          https://your-frontend.vercel.app  (no trailing slash)
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

---

## Database Schema

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  password     String
  name         String
  role         Role      @default(BUYER)
  avatar       String?
  phone        String?
  bio          String?
  googleId     String?   @unique
  githubId     String?   @unique
  isVerified   Boolean   @default(false)
  isActive     Boolean   @default(true)
  refreshToken String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  properties   Property[]
  bookings     Booking[]
  favorites    Favorite[]
  reviews      Review[]
  payments     Payment[]
}

model Property {
  id          String         @id @default(cuid())
  title       String
  description String
  price       Float
  type        PropertyType
  status      PropertyStatus @default(AVAILABLE)
  address     String
  city        String
  state       String
  zipCode     String
  country     String         @default("Bangladesh")
  lat         Float?
  lng         Float?
  bedrooms    Int            @default(0)
  bathrooms   Float          @default(0)
  area        Float
  features    String[]
  images      String[]
  videoUrl    String?
  isFeatured  Boolean        @default(false)
  viewCount   Int            @default(0)
  agentId     String
  agent       User           @relation(fields: [agentId], references: [id])
  bookings    Booking[]
  favorites   Favorite[]
  reviews     Review[]
  payments    Payment[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}
```

After any schema change:

```bash
npm run db:push      # dev (no migration history)
npm run db:migrate   # production (creates migration files)
npm run db:generate  # always run after schema changes
```

---

## Seed Data

`src/lib/seed.ts` creates:

- **3 demo users** — admin, agent, buyer
- **~15 Bangladesh properties** in Dhaka, Chattogram, and Sylhet with BDT prices in lakh/crore range
- **Safe to re-run** — deletes all dependent records (favorites, reviews, payments, bookings) before deleting and re-inserting agent properties, satisfying FK constraints

```bash
npm run db:seed
```
