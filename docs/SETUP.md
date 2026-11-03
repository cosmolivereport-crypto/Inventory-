# Local setup

## 1. Requirements
- Node.js 20+
- PostgreSQL 15+
- Git

## 2. Install
```bash
git clone https://github.com/cosmolivereport-crypto/Inventory-.git
cd Inventory-
git checkout feat/inventory-system
npm install
cp .env.example .env
```

Set DATABASE_URL in .env to your local PostgreSQL database.

## 3. Create database and schema
```bash
createdb cosmo_inventory
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
Open http://localhost:3000.

## 4. API quick checks
- GET /api/health
- GET /api/products
- POST /api/products
- GET /api/stock
- GET /api/stock/movements
- POST /api/purchases
- POST /api/sales
- POST /api/stock/adjustments
- POST /api/stock/transfers
- POST /api/returns
- GET/POST /api/payments
- GET /api/masters
- GET /api/reports/summary

All write APIs require a valid database and IDs from that database. The starter API is not yet protected by authentication; do not expose it to the public internet until server-side authentication, authorization, rate limits and audit attribution are implemented.

## 5. Production checklist
- Add authentication and enforce role permissions in every API.
- Add robust validation and tests for GST, invoice rounding, refunds, returns and stock concurrency.
- Configure email/WhatsApp alert provider, scheduled expiry/reorder notifications.
- Configure object-storage backups and perform restore tests.
- Configure HTTPS, secrets, monitoring, database migration and deployment.
