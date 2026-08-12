# Mini ERP + CRM Operations Portal

A small internal ERP/CRM system for a wholesale/distribution company, covering customer
CRM, product & inventory management, and a sales challan workflow with real stock control.

Built for the **Full Stack Developer Case Study**.

---

## 1. Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | Node.js, TypeScript, Express.js, Prisma ORM, PostgreSQL, Zod (validation), JWT (auth) |
| Frontend   | React, TypeScript, React Router, Axios, Vite |
| Deployment | Docker / docker-compose (local), Render / Railway / Fly.io (backend), Vercel / Netlify (frontend), Supabase / Neon / Render Postgres (DB) |

---

## 2. Architecture Overview

```
erp-crm-portal/
├── backend/                # Express + TypeScript REST API
│   ├── prisma/
│   │   ├── schema.prisma   # Data model (Users, Customers, Products, Challans, ...)
│   │   └── seed.ts         # Creates one login per role + sample customer/product
│   └── src/
│       ├── config/db.ts        # Shared Prisma client
│       ├── middleware/         # JWT auth, role guard, centralized error handler
│       ├── controllers/        # Business logic per module
│       ├── routes/             # Express routers, wired to role restrictions
│       ├── utils/               # ApiError, pagination helper
│       ├── app.ts              # Express app (middleware + route mounting)
│       └── index.ts            # Server entrypoint
├── frontend/                # React + TypeScript admin UI (Vite)
│   └── src/
│       ├── api/client.ts       # Axios instance with JWT interceptor
│       ├── context/AuthContext.tsx
│       ├── components/         # Layout, ProtectedRoute, Pagination
│       └── pages/               # Login, Dashboard, Customers, Products, Challans
├── postman/
│   └── ERP_CRM_Portal.postman_collection.json
├── docker-compose.yml        # One-command local stack (Postgres + backend + frontend)
└── README.md
```

**Request flow:** React frontend → Axios (attaches JWT from `localStorage`) → Express REST
API → role middleware → controller → Prisma → PostgreSQL.

**Why Prisma:** gives type-safe queries and migrations without hand-writing SQL, which
keeps the data-access layer small and easy to review for a case study of this size.

**Business logic worth calling out:**
- **Stock never goes negative.** Every path that reduces stock (manual OUT movement,
  confirming a challan) runs inside a Prisma transaction that checks availability first
  and throws a `400` with per-product shortfall details if insufficient.
- **Challans store a product snapshot** (`productNameSnapshot`, `productSkuSnapshot`,
  `unitPriceSnapshot`) at creation time, not just a foreign key — so a challan from last
  month still shows the price and name as they were then, even if the product is later
  renamed or repriced.
- **Challan numbers** are generated automatically as `CH-YYYYMMDD-0001` (sequential per
  day).
- **Cancelling a CONFIRMED challan restores the deducted stock** with an audit-trail
  `IN` stock movement (see Assumptions below — this wasn't explicitly required but keeps
  inventory accurate).

---

## 3. Roles & Access Control

Simple JWT auth; the role is embedded in the token and checked per-route.

| Module              | Admin | Sales | Warehouse | Accounts |
|----------------------|:---:|:---:|:---:|:---:|
| Customers: view       | ✅ | ✅ | ✅ | ✅ |
| Customers: create/edit/notes | ✅ | ✅ | ❌ | ❌ |
| Products: view        | ✅ | ✅ | ✅ | ✅ |
| Products: create/edit/stock adjust | ✅ | ❌ | ✅ | ❌ |
| Challans: view        | ✅ | ✅ | ✅ | ✅ |
| Challans: create/edit | ✅ | ✅ | ❌ | ❌ |
| Challans: confirm     | ✅ | ✅ | ✅ | ❌ |
| Challans: cancel      | ✅ | ❌ | ✅ | ❌ |

---

## 4. Local Setup

### Option A — Docker (fastest, recommended)

Requires only Docker installed.

```bash
git clone <your-repo-url>
cd erp-crm-portal
docker compose up --build
```

Then, in a second terminal, run migrations + seed data inside the backend container:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Health check: http://localhost:4000/health

### Option B — Run natively (no Docker)

**Prerequisites:** Node.js 20+, PostgreSQL 14+ running locally.

**Backend:**
```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to your local Postgres, and set JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```
Backend runs on `http://localhost:4000`.

**Frontend** (new terminal):
```bash
cd frontend
cp .env.example .env
# .env already points to http://localhost:4000/api by default
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

### Test Login Credentials (created by the seed script)

All use password: **`Password@123`**

| Role      | Email |
|-----------|-------|
| Admin     | admin@erp.test |
| Sales     | sales@erp.test |
| Warehouse | warehouse@erp.test |
| Accounts  | accounts@erp.test |

---

## 5. Environment Variables

**Backend (`backend/.env`):**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random secret used to sign JWTs — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `8h` |
| `PORT` | API port (default `4000`) |
| `CORS_ORIGIN` | Allowed frontend origin |

**Frontend (`frontend/.env`):**

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the backend API, e.g. `http://localhost:4000/api` |

Neither `.env` file is committed — only the `.env.example` templates are, per standard
practice for secret hygiene.

---

## 6. API Overview

All routes are prefixed with `/api` and (except `/auth/login`) require
`Authorization: Bearer <token>`.

```
POST   /auth/login
GET    /auth/me

GET    /customers?search=&status=&customerType=&page=&limit=
POST   /customers
GET    /customers/:id
PUT    /customers/:id
POST   /customers/:id/notes

GET    /products?search=&lowStock=&page=&limit=
POST   /products
GET    /products/:id
PUT    /products/:id
POST   /products/:id/stock-movement
GET    /products/:id/stock-log

GET    /challans?status=&customerId=&page=&limit=
POST   /challans
GET    /challans/:id
PUT    /challans/:id
POST   /challans/:id/confirm
POST   /challans/:id/cancel
```

Full request/response examples: import `postman/ERP_CRM_Portal.postman_collection.json`
into Postman. Run **Auth → Login (Admin)** first — it auto-saves the JWT into a
collection variable used by every other request.

---

## 7. Deployment Guide (free-tier friendly)

1. **Database:** create a free Postgres instance on [Neon](https://neon.tech) or
   [Supabase](https://supabase.com). Copy the connection string into `DATABASE_URL`.
2. **Backend:** push `backend/` to GitHub, connect the repo to
   [Render](https://render.com) (or Railway/Fly.io) as a Web Service.
   - Build command: `npm install && npm run build && npx prisma generate`
   - Start command: `npx prisma migrate deploy && npm start`
   - Add the environment variables from section 5.
3. **Frontend:** connect `frontend/` to [Vercel](https://vercel.com) or
   [Netlify](https://netlify.com).
   - Build command: `npm run build`, output directory: `dist`
   - Set `VITE_API_URL` to the deployed backend URL + `/api`.
4. Update the backend's `CORS_ORIGIN` to the deployed frontend URL once you have it.
5. Run `npx prisma db seed` once against the production database (via Render's shell,
   or locally with `DATABASE_URL` pointed at production) to create the four role logins.

AWS deployment was treated as the optional bonus described in the brief and was not
pursued in favor of finishing all core modules within the time available.

---

## 8. Assumptions Made

- Confirming a challan and cancelling a confirmed challan are treated as symmetric:
  cancelling a `CONFIRMED` challan restores the stock it had deducted (with an audit-
  trail `IN` movement). This wasn't explicitly specified but seemed necessary for stock
  accuracy — otherwise cancelled sales would permanently understate inventory.
  Cancelling a `DRAFT` challan is a no-op on stock, since drafts never touched it.
  Only `DRAFT` challans can be cancelled.
- A challan's product lines can only be edited while it's still `DRAFT`; once
  `CONFIRMED` or `CANCELLED` it's treated as an immutable record.
- `currentStock` on a product is never edited directly through the product edit form —
  it only changes via a logged stock movement or a confirmed/cancelled challan, so the
  movement log stays a complete audit trail.
- Roles for challan confirmation include Warehouse (in addition to Sales/Admin), since
  confirming is really "goods have left the warehouse," which is a warehouse-team
  responsibility in most real setups.
- GST number, category, and location are optional fields, matching "optional" in the
  brief for GST and general real-world flexibility for the others.

## 9. Known Limitations / Incomplete Parts

- No automated test suite (unit/integration tests) was added given the 48-hour window —
  manual verification was done via the Postman collection.
- - Challan PDF export is implemented (bonus feature). Full invoice generation (separate from challan) was not built.I
- No password-reset flow; only seeded logins exist. User management (creating new
  employee accounts through the UI) is not built — users are currently seeded directly.
- Stock movement log and challan history views are basic tables without CSV export.
- No S3 image upload for products (bonus item), and no Docker/GitHub Actions CI/CD
  pipeline beyond the provided `Dockerfile`s and `docker-compose.yml`.
- AWS deployment was not pursued (see Deployment Guide above) — the app is deployment-
  ready for Render/Vercel/Supabase instead, per the brief's accepted alternative.
## Live Deployment
- Frontend: https://erp-crm-operations-portal.vercel.app
- Backend API: https://erp-crm-backend.onrender.com
- GitHub Repo: https://github.com/Chandankumar3050/erp-crm-operations-portal

## Test Credentials (all roles, password: Password@123)
- Admin: admin@erp.test
- Sales: sales@erp.test
- Warehouse: warehouse@erp.test
- Accounts: accounts@erp.test

## Note
Backend hosted on Render free tier — spins down after 15 min inactivity, 
first request may take 30-50 seconds.