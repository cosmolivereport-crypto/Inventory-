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

## 3. Configure environment
Open `.env` and set:
- `DATABASE_URL`: your PostgreSQL connection string.
- `AUTH_SECRET`: a unique random value at least 32 characters long. Generate one with `openssl rand -base64 48`.
- `INITIAL_ADMIN_NAME`: owner display name.
- `INITIAL_ADMIN_EMAIL`: owner login email.
- `INITIAL_ADMIN_PASSWORD`: unique password at least 14 characters long. Do not commit this file.

## 4. Create database and run seed
```bash
createdb cosmo_inventory
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```
Open http://localhost:3000 and sign in using the owner email and password set in your local `.env`.

The seed creates sample categories, warehouse and demo products. It only creates the first owner user when the three INITIAL_ADMIN variables are present. Sample products and quantities are illustrative; do not treat them as actual Cosmosentials stock.

## 5. Main API endpoints
- `GET /api/health` - service check
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
- `GET /api/products`, `POST /api/products`
- `GET /api/stock`, `GET /api/stock/movements`
- `GET /api/purchases`, `POST /api/purchases`
- `GET /api/sales`, `POST /api/sales`
- `POST /api/stock/adjustments`, `POST /api/stock/transfers`
- `POST /api/returns`
- `GET/POST /api/payments`, `GET/POST /api/expenses`
- `GET /api/masters`, `GET /api/reports/summary`, `GET /api/alerts`
- `GET /api/exports/stock` - stock valuation CSV

All write APIs require a database and valid record IDs. The app has signed-in session protection, but fine-grained role checks and a complete permission matrix still need final review before public production deployment.

## 6. Production checklist
- Deploy PostgreSQL and set the environment variables in the hosting provider.
- Run `npx prisma db push` during initial setup; use reviewed migration files for controlled future schema releases.
- Test login, data isolation, stock concurrency, GST, invoice rounding, returns and payment reconciliation.
- Configure daily encrypted database backups and test restores.
- Configure HTTPS, monitoring, secrets rotation, email/WhatsApp providers and scheduled notifications.
- Never expose database credentials or owner login details in GitHub.
