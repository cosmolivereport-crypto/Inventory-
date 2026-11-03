# Local setup

## 1. Requirements
- Node.js 20+
- Docker Desktop / Docker Engine with Compose, or local PostgreSQL 15+
- Git

## 2. Get the project
~~~bash
git clone https://github.com/cosmolivereport-crypto/Inventory-.git
cd Inventory-
git checkout feat/inventory-system
npm install
cp .env.example .env
~~~

## 3. Configure environment
Open .env and set:
- DATABASE_URL: PostgreSQL connection string.
- POSTGRES_PASSWORD: local Docker database password. Keep it aligned with DATABASE_URL.
- AUTH_SECRET: unique random value at least 32 characters long. Generate one with openssl rand -base64 48.
- INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD: first owner account. Password must be 14+ characters.
- Never commit .env or share owner credentials.

## 4. Start PostgreSQL with Docker Compose
~~~bash
docker compose up -d postgres
~~~
Wait until the database health check reports healthy, then run:
~~~bash
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
~~~
Open http://localhost:3000 and sign in using the owner email and password in .env.

Without Docker, start your PostgreSQL server and create a database named cosmo_inventory before running the Prisma commands.

The seed creates sample categories, a Main Warehouse and demo product SKUs with batch records. It only creates the first owner user when all INITIAL_ADMIN_* values are set. Sample items and stock are illustrative. Remove seed demo data or start with a clean database before loading real company stock.

## 5. Main pages
- Dashboard: live stock value, units, low/out-of-stock alerts, movements and invoices
- Products: product master, separate SKU/pack variants, barcode, HSN/GST, reorder level, opening stock and CSV import/export
- Purchases: multi-line supplier bills, batch/expiry capture and stock receipt
- Sales: multi-line invoices, barcode/SKU entry and FEFO batch allocation
- Returns: invoice-linked sales returns and purchase returns with quantity validation and credit-note values
- Stock levels, ledger, physical adjustments, multi-warehouse transfers and batch/expiry alerts
- Supplier/customer masters, payments, outstanding balances and expenses
- Reports: stock valuation, expiry/dead-stock alerts, monthly trends and batch-cost based P&L
- Team & roles: owner-managed staff accounts
- Activity log: recorded inventory and administration changes

## 6. API endpoints
- GET /api/health - database connectivity check
- POST /api/auth/login, POST /api/auth/logout, GET /api/auth/session
- GET/POST /api/products, POST /api/products/import
- GET /api/stock, GET /api/stock/movements
- GET/POST /api/purchases, GET/POST /api/sales
- GET/POST /api/returns
- POST /api/stock/adjustments, POST /api/stock/transfers
- GET/POST /api/payments, GET/POST /api/expenses
- GET /api/masters, POST /api/masters/create, GET/POST/PATCH /api/team
- GET /api/reports/summary, GET /api/reports/trends, GET /api/reports/profit-loss
- GET /api/alerts, GET /api/exports/stock, GET /api/audit-log

## 7. Operational rules
- Every product/pack variant needs its own unique SKU. Do not combine Pack of 1 / 2 / 3 / 4 into one stock record.
- Sales allocate from earliest-expiry eligible lots first (FEFO); expired lots cannot be sold.
- Purchases for batch-tracked products require batch and expiry details.
- Sales, purchases, returns, transfers and adjustments post a stock ledger movement in the same database transaction as their document.
- Posted movements are append-only; correct mistakes through a return, reversal or physical adjustment.
- Payment allocation updates the linked invoice or bill outstanding amount.
- Stock valuation uses batch cost where available; sale COGS stores the cost at the time of sale.

## 8. Production checklist
This repository is not configured with Cosmosentials' live database or deployed hosting yet. Before office use:
- Provision a managed PostgreSQL database and secure backups; rehearse restore.
- Keep `SEED_DEMO_DATA=false` in production. Create the initial owner through the seed without creating sample inventory.
- Set production secrets and initial owner credentials in the hosting provider, never in Git.
- Deploy the app and verify /api/health reports a database connection.
- Validate GST place-of-supply, CGST/SGST/IGST, tax rounding, HSN classification and invoice formats with your accountant. The current tax fields are configurable line-rate calculations and are not a complete GST compliance engine.
- Implement and review fine-grained role policy for all read/report endpoints, rate limiting, CSRF/origin protection and audit retention before exposing the service publicly.
- Test concurrent stock posting, returns, partial payments, negative stock prevention, expiry boundaries and financial reports against known test cases.
- Connect Shopify, email/WhatsApp notifications and any ERP imports only after provider credentials and mapping rules are supplied.
- Use migration files for controlled production schema changes; prisma db push is intended for first local setup / development.
