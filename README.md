# Blaze Operations Portal

Mini ERP + CRM for a wholesale/distribution team. It combines customer follow-ups, warehouse stock, and sales challans in one role-aware operations workspace.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, TypeScript, Express, Zod
- Data: PostgreSQL, Prisma (works with Neon)
- Auth: JWT bearer tokens and four roles: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`

## Local Setup

1. Install Node.js 20+ and create a PostgreSQL database (Neon is supported).
2. Copy `.env.example` to `.env`, then set `DATABASE_URL` and a strong `JWT_SECRET`.
3. Install dependencies: `npm install`
4. Generate the client and apply the schema: `npm run db:generate` then `npm run db:migrate -- --name init`
5. Add demo data: `npm run db:seed`
6. Start both applications: `npm run dev`

The API starts on `http://localhost:4000`; the Vite client prints its local URL (normally `http://localhost:5173`). Set `VITE_API_URL` if the API is hosted elsewhere.

## Demo Credentials

All accounts use password `Blaze@123`.

| Role | Email |
| --- | --- |
| Admin | `admin@blaze.local` |
| Sales | `sales@blaze.local` |
| Warehouse | `warehouse@blaze.local` |
| Accounts | `accounts@blaze.local` |

## Business Rules

`POST /api/challans/:id/confirm` executes as a serializable Prisma/PostgreSQL transaction. It validates every line against current stock, decrements stock, creates an `OUT` stock-movement record, and only then marks the challan confirmed. Any insufficient line aborts the entire transaction, leaving stock unchanged. Challan items store the name, SKU, and unit price snapshot in addition to the product ID.

## API Overview

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET|POST /api/customers`, `GET|PATCH /api/customers/:id`, `POST /api/customers/:id/follow-ups`
- `GET|POST /api/products`, `PATCH /api/products/:id`, `POST /api/products/:id/movements`, `GET /api/products/:id/movements`
- `GET|POST /api/challans`, `GET /api/challans/:id`, `POST /api/challans/:id/confirm`, `POST /api/challans/:id/cancel`
- `GET /api/dashboard`, `GET /health`

All protected endpoints expect `Authorization: Bearer <JWT>`. The list endpoints support `page` and `limit`; customers/products also accept `search`.

## Deployment

Deploy `client` to Vercel/Netlify as a Vite site, setting `VITE_API_URL` to the public API URL. Deploy `server` to Render/Railway/Fly with the build command `npm run build -w server` and start command `npm run start -w server`. Set `DATABASE_URL`, `JWT_SECRET`, and `PORT` in the backend host. Run Prisma migrations against the production database during the release.

## Assumptions and Limits

- This case-study scope models stock at the product/location level; no multi-warehouse transfer entity is included.
- Cancelling a confirmed challan is currently disallowed by workflow convention and should be handled by a compensating return/stock adjustment rather than silently restoring stock.
- Product images, PDF export, and purchase orders/invoices are intentionally left as bonus/future modules.
