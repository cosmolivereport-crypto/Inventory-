# Local setup

## 1. Requirements
- Windows 11 / Windows 10, macOS or Linux
- Node.js 22 LTS (the CI build currently uses Node 22; Node.js 20+ is the minimum)
- Git
- Docker Desktop with WSL 2 on Windows, or a PostgreSQL 15+ server

## 2. Get the project
~~~powershell
git clone https://github.com/cosmolivereport-crypto/Inventory-.git
cd Inventory-
git checkout feat/inventory-system
npm install
Copy-Item .env.example .env
~~~

## 3. Configure the local environment
Open .env in Notepad or VS Code.

- DATABASE_URL: PostgreSQL runtime URL. For local Docker, use the local connection shown in .env.example.
- DIRECT_URL: direct PostgreSQL URL used by Prisma CLI migrations. For local Docker, keep it the same as DATABASE_URL.
- POSTGRES_PASSWORD: local Docker database password. Keep it identical to the password in DATABASE_URL and DIRECT_URL.
- AUTH_SECRET: unique random value at least 32 characters long. Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
- INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD: first owner account. Password must be at least 14 characters.
- SEED_DEMO_DATA=false: safe default; creates the owner account without sample categories, demo products or sample stock. Set true only on a separate test database.
- Never commit .env or share owner credentials.

## 4. Start PostgreSQL with Docker Compose
Start Docker Desktop first. Then in PowerShell:
~~~powershell
docker compose up -d postgres
docker compose ps
~~~
Wait until the postgres service is healthy. To inspect a problem:
~~~powershell
docker compose logs postgres
~~~

## 5. Create the database schema and owner login
Run these commands for a new, empty local database:
~~~powershell
npx prisma generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
~~~
The first migration creates the database tables. Commit the generated prisma/migrations folder to GitHub so the same schema can be applied to staging and production.

Open http://localhost:3000. Sign in using INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD from .env. To confirm database health, open http://localhost:3000/api/health; it should report database connected.

Without Docker, start PostgreSQL separately, create a database named cosmo_inventory and set DATABASE_URL and DIRECT_URL to the correct connection string before running the same Prisma commands.

The seed always creates the initial owner when INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are set. With SEED_DEMO_DATA=false, it does not add sample products or stock. On a separate test database only, set SEED_DEMO_DATA=true to create illustrative categories, a warehouse and demo products. Never seed demo data into the real company database.

## 6. Set up master records before importing stock
Sign in as owner and open Master records:
- Add the categories used by your catalogue.
- Add brands.
- Add units (for example PCS, ML, GM) using their exact symbols.
- Add each warehouse. Give every warehouse a unique code (for example MAIN, STORE1).

Category names, brand names, unit symbols and warehouse codes in the import file must match these master records exactly.

## 7. Prepare and import Cosmosentials products
Open Products → Template to download the CSV template. Fill these columns:

SKU, Name, Barcode, Category, Brand, Unit, HSN Code, GST Rate, Cost Price, Selling Price, MRP, Reorder Level, Opening Stock, Warehouse Code, Batch Number, Expiry Date, Track Batch, Track Expiry

Rules:
- Every pack size/variant must have a separate unique SKU. For example, a cleanser Pack of 1 and Pack of 2 must not share one SKU or one stock quantity.
- Use actual physical counted stock as Opening Stock, not an estimated Shopify available quantity.
- Enter cost price, selling price, MRP and reorder level carefully.
- For opening stock greater than zero, the warehouse code is required.
- Batch tracking is on by default. Enter Batch Number for opening stock if Track Batch is true.
- Expiry tracking is on by default. Enter expiry as YYYY-MM-DD for opening stock if Track Expiry is true.
- Use true/false for the two tracking columns.
- Existing SKU or duplicate SKU will stop the import; the system will not silently overwrite an existing product.
- The import currently assigns one opening-stock warehouse per product row. For multiple warehouse balances, create the product once, then use a stock transfer or controlled stock adjustment for the other warehouse.

First import a small test CSV (2-3 products) into a test database, verify quantities and batch/expiry, then import the full checked catalogue.

## 8. Test the transaction workflow in a separate test database
1. Add a test supplier and customer.
2. Create a purchase with multiple items, batch numbers, expiry dates and costs; verify that stock increases.
3. Create a multi-item sale; verify stock decreases and earliest-expiry eligible batches (FEFO) are consumed first.
4. Record a customer receipt against that invoice; test a partial payment and verify the outstanding amount.
5. Create a sales return against the original invoice; verify quantity, credit value and stock return.
6. Create a purchase return against the original supplier bill; verify stock goes out.
7. Test warehouse transfer and physical stock adjustment.
8. Check stock valuation, expiry alerts, ledger and P&L against hand-calculated examples.

Do not test with real customer invoices or live stock until the entire flow has passed in a test database.

## 9. Deploy to staging and production
The repository is not connected to live hosting or a live Cosmosentials database yet.

Suggested hosted architecture:
- GitHub: source code and pull requests.
- Vercel: Next.js hosting, Preview and Production deployments.
- Managed PostgreSQL such as Neon: separate staging and production databases/branches.

For a Neon database, copy a pooled connection string into DATABASE_URL for the running app, and a direct/unpooled connection string into DIRECT_URL for Prisma migrations. Keep both secret. Neon documents the pooled and direct connection options here: https://neon.com/docs/get-started/connect-neon

Typical deployment sequence:
1. Create separate staging and production PostgreSQL databases/branches.
2. In Vercel, import cosmolivereport-crypto/Inventory- from GitHub; set the production branch to main. A push to the feature pull request can create a Preview deployment for staging.
3. Set these environment variables separately for Preview and Production: DATABASE_URL, DIRECT_URL, AUTH_SECRET, INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, SEED_DEMO_DATA=false.
4. Keep Preview database credentials pointed at staging. Keep Production credentials pointed only at production. Never use the live database for Preview.
5. Generate a strong, different AUTH_SECRET for production. Do not reuse the local development secret.
6. Create and commit migration files from a clean development database. After reviewing the migration and taking a backup, apply it with npm run db:deploy.
7. Run the owner-only seed once against the selected environment with SEED_DEMO_DATA=false. This creates the first owner and does not add sample stock.
8. Deploy a Preview first, sign in and test all workflows. Only after business sign-off should the PR be marked ready, reviewed and merged to main for Production.
9. Verify /api/health, HTTPS, login, stock balances, database backup and restore.

Vercel's local, Preview and Production environments have separate environment-variable scopes: https://vercel.com/docs/deployments/environments

Do not deploy the current branch directly to Production before the latest CI passes, a migration is committed, and staging tests pass.

## 10. Important business and security limits before office go-live
- GST currently uses a configurable line tax rate; this is not a full Indian GST invoicing engine. CGST/SGST/IGST, place of supply, HSN validation, credit-note rules, tax rounding, statutory invoice numbering and e-invoice/e-way bill workflows need accountant review and implementation.
- P&L is a management estimate, not audited or statutory accounting.
- Review role permissions on every read and write API, add login rate limiting and CSRF/origin protection, and test inactive-user revocation before adding all employees.
- Set up daily database backups, point-in-time recovery where available, and a tested restore procedure.
- Add automated integration tests for purchases, sales, returns, payments, transfers, concurrent stock updates and negative-stock prevention.
- Shopify sync, MARG ERP imports, scheduled low-stock/expiry alerts and WhatsApp/email notifications require field mapping, provider credentials and separate testing. They are not active integrations today.
- Use Prisma migration files and npm run db:deploy for staging/production. Keep db:push for disposable development databases only.
