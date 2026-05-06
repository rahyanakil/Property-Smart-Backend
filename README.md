# PropertySmart — Backend API

Express 5 REST API with TypeScript, Prisma ORM, Neon PostgreSQL, Stripe payments, Cloudinary image storage, and JWT cookie authentication. Deployed as a Vercel serverless function.

---

## Stack

| | |
|---|---|
| Runtime | Node.js 20 · TypeScript 5 |
| Framework | Express 5 |
| ORM | Prisma 5 |
| Database | Neon PostgreSQL (serverless) |
| Auth | JWT (httpOnly cookies) · bcryptjs |
| File uploads | Multer (memory) → Cloudinary |
| Payments | Stripe |
| Validation | Zod |
| Deployment | Vercel serverless (`api/index.ts`) |

---

## Project Structure

```
property-backend/
├── api/
│   └── index.ts            Vercel entry — exports Express app
├── prisma/
│   └── schema.prisma       Models: User Property Booking Favorite Review Payment
└── src/
    ├── config/
    │   └── index.ts        Typed env config
    ├── lib/
    │   ├── prisma.ts       Singleton PrismaClient
    │   ├── cloudinary.ts   uploadImage / deleteImage helpers
    │   └── seed.ts         Demo accounts + Bangladesh properties
    ├── middlewares/
    │   ├── auth.middleware.ts    authenticate · authorize(roles)
    │   ├── validate.middleware.ts Zod schema validation
    │   ├── upload.middleware.ts   Multer (5 MB, images only)
    │   └── error.middleware.ts    notFound · errorHandler
    ├── modules/
    │   ├── auth/            register · login · logout · refresh · me · OAuth
    │   ├── user/            profile · password · avatar · favorites · admin
    │   ├── property/        CRUD · search · filters · stats · images
    │   ├── booking/         create · list (buyer/agent/admin) · updateStatus
    │   ├── payment/         intent · webhook · list · stats
    │   └── review/          create · list · delete
    ├── utils/
    │   ├── ApiError.ts      throw new ApiError(status, message)
    │   ├── ApiResponse.ts   { success, message, data } shape
    │   ├── asyncHandler.ts  Wraps async route handlers
    │   └── jwt.ts           sign · verify · cookieOptions
    ├── app.ts               Express app (CORS · body parsing · routes)
    └── server.ts            Local dev server (app.listen)
```

---

## Setup

### 1 — Install

```bash
# From repo root (npm workspaces)
npm install
```

### 2 — Environment

```bash
cp .env.example .env
```

```env
# Database (Neon connection string — use the -pooler endpoint)
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require&connect_timeout=15&pool_timeout=15&connection_limit=5"

# Server
PORT=5000
NODE_ENV=development

# JWT (min 32 chars each, must be different)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_at_least_32
JWT_REFRESH_EXPIRES_IN=30d

# CORS — frontend origin, no trailing slash
CLIENT_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 3 — Database

```bash
npm run db:push      # push schema to Neon (no migration history)
npm run db:generate  # regenerate Prisma client after schema changes
npm run db:seed      # seed demo accounts + Bangladesh sample properties
```

### 4 — Run

```bash
npm run dev    # tsx watch — hot reload on :5000
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | `tsx watch src/server.ts` — hot reload |
| `npm run build` | `tsc` → `dist/` |
| `npm run start` | `node dist/server.js` |
| `npm run db:push` | Sync schema to DB (no migration files) |
| `npm run db:migrate` | Create Prisma migration files |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio at localhost:5555 |
| `npm run lint` | ESLint on `src/` |
| `postinstall` | `prisma generate` — auto-runs on Vercel after `npm install` |

---

## Request Lifecycle

```
Router
  → validate(zodSchema)        — Zod parse req.body / req.query
  → authenticate               — verify JWT from cookie or Authorization header
  → authorize('ROLE', ...)     — role check
  → controller                 — parse, call service, return ApiResponse
  → service                    — business logic + Prisma queries
```

**Error flow:** throw `new ApiError(statusCode, message)` anywhere → caught by `errorHandler` middleware → JSON `{ success: false, message, errors? }`.

---

## API Routes

All routes are prefixed `/api/v1`.

### Auth — `/auth`

```
POST   /register          Create account (body: name, email, password, role?)
POST   /login             Login → sets accessToken + refreshToken cookies
POST   /logout            Clear cookies
POST   /refresh           Rotate both tokens
GET    /me                Current user (authenticate required)
GET    /oauth/:provider/callback   Google/GitHub OAuth (mock)
```

### Properties — `/properties`

```
GET    /                  List (public) — filters: type, status, city, state,
                          minPrice, maxPrice, minBedrooms, search, isFeatured,
                          sortBy, sortOrder, page, limit
GET    /featured          Featured available listings
GET    /stats             Platform stats (Admin)
GET    /my                Agent's own listings (Agent/Admin)
GET    /:id               Detail (public, increments viewCount)
POST   /                  Create (Agent/Admin) — multipart/form-data
PATCH  /:id               Update (Agent/Admin) — multipart/form-data
DELETE /:id               Delete (Agent/Admin)
DELETE /:id/images        Remove specific image by URL (Agent/Admin)
```

### Bookings — `/bookings`

```
POST   /                  Create viewing request (Buyer)
GET    /my                Buyer's bookings
GET    /agent             Bookings for agent's properties
GET    /admin             All bookings (Admin)
PATCH  /:id               Update status: CONFIRMED | COMPLETED | CANCELLED
```

### Payments — `/payments`

```
POST   /intent            Create Stripe PaymentIntent (Buyer)
GET    /my                Buyer's payment history
GET    /                  All payments (Admin)
GET    /stats             Revenue statistics (Admin)
POST   /webhook           Stripe webhook — raw body, no JSON middleware
```

### Users — `/users`

```
GET    /profile           Own profile
PATCH  /profile           Update profile (name, phone, bio)
PATCH  /password          Change password
POST   /avatar            Upload avatar (multipart/form-data)
GET    /favorites         Saved properties (Buyer)
POST   /favorites/:propertyId  Toggle favorite (Buyer)
GET    /                  All users (Admin)
PATCH  /:id/role          Change role (Admin)
PATCH  /:id/status        Toggle active/inactive (Admin)
```

### Reviews — `/properties/:propertyId/reviews`

```
GET    /                  List reviews (public)
POST   /                  Create review — rating + comment (Buyer)
DELETE /:id               Delete review (Buyer owns it, or Admin)
```

### Health

```
GET    /        { status: "ok", message: "PropertySmart API", version: "1.0.0" }
GET    /health  { status: "ok", timestamp: "..." }
```

---

## Authentication

JWT tokens are stored in **httpOnly cookies**:

| Cookie | Expiry | Used for |
|---|---|---|
| `accessToken` | 7 days | All authenticated requests |
| `refreshToken` | 30 days | `POST /auth/refresh` rotation |

**Cookie flags:**

| Environment | `secure` | `sameSite` |
|---|---|---|
| Development | `false` | `lax` |
| Production | `true` | `none` |

`sameSite: 'none'` + `secure: true` is required for cross-origin cookies between Vercel frontend and backend deployments.

The `authenticate` middleware reads the token from `req.cookies.accessToken` first, then falls back to the `Authorization: Bearer <token>` header.

---

## File Uploads

- **Middleware:** Multer with memory storage, 5 MB limit, images only (`image/jpeg`, `image/png`, `image/webp`)
- **Storage:** Cloudinary via `uploadImage(buffer, folder)` in `src/lib/cloudinary.ts`
- **Folders:** `'properties'` for property images · `'property-smart'` for avatars
- **Limits:** Properties accept up to 10 images; avatar accepts 1

---

## CORS

Allowed origins:
- `CLIENT_URL` env var (explicit frontend URL)
- `http://localhost:3000` and `http://localhost:3001` (local dev)
- Any `*.vercel.app` origin (Vercel preview deployments)
- Requests with no `Origin` header (server-to-server, curl)

---

## Vercel Deployment

The `api/index.ts` file exports the Express app as a default export. `vercel.json` routes all traffic to it:

```json
{
  "version": 2,
  "builds": [{ "src": "api/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/api/index.ts" }]
}
```

The `postinstall` script runs `prisma generate` automatically after every `npm install` on Vercel, keeping the Prisma client in sync with the schema.

---

## Database Schema

```
User          id · email · password · name · role · avatar · phone · bio
              googleId · githubId · isVerified · isActive · refreshToken

Property      id · title · description · price · type · status
              address · city · state · zipCode · country · lat · lng
              bedrooms · bathrooms · area · features[] · images[]
              videoUrl · isFeatured · viewCount · agentId

Booking       id · propertyId · buyerId · date · timeSlot · status · notes

Favorite      id · userId · propertyId

Review        id · propertyId · userId · rating · comment

Payment       id · propertyId · buyerId · amount · currency · status
              stripePaymentIntentId · stripeClientSecret
```

**Enums:** `Role` (BUYER, AGENT, ADMIN) · `PropertyType` · `PropertyStatus` · `BookingStatus` · `PaymentStatus`

---

## Demo Data

The seed script (`src/lib/seed.ts`) creates:

- 3 demo accounts (admin, agent, buyer)
- ~15 Bangladesh properties across Dhaka, Chattogram, Sylhet with BDT prices
- Prices in lakh/crore range (displayed via `formatPrice()` on the frontend)

Re-running the seed safely deletes the agent's previous properties and all related records (favorites, bookings, reviews, payments) before re-inserting.
