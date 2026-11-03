# Cosmosentials Inventory Management System

A stock and operations system starter tailored for Cosmosentials.

## Main modules
- Dashboard with live stock valuation, quantity, reorder alerts and movements
- Product master with unique SKU per pack/variant, barcode, HSN/GST, cost/MRP and reorder levels
- CSV product import/export and opening stock
- Multi-warehouse inventory, batch/lot tracking, expiry alerts and FEFO sales allocation
- Multi-line purchases and sales invoices
- Sales returns and purchase returns linked to the original invoice/bill
- Stock ledger, physical adjustments and warehouse transfers
- Supplier/customer masters, partial payments, outstanding balances and expenses
- P&L estimates using saved batch unit cost, sales returns and recorded expenses
- Team login, owner-managed roles and activity log
- PostgreSQL database with Prisma ORM

## Tech stack
- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- Zod validation, bcrypt password hashing and signed sessions

## Local startup
1. Install Node.js 20+ and Docker Desktop.
2. Clone the repository and create a local environment file:
   ~~~bash
   git clone https://github.com/cosmolivereport-crypto/Inventory-.git
   cd Inventory-
   git checkout feat/inventory-system
   npm install
   Copy-Item .env.example .env (PowerShell) / cp .env.example .env (macOS/Linux)
   ~~~
3. Set your local owner password and a unique AUTH_SECRET in .env.
4. Start PostgreSQL and initialize:
   ~~~bash
   docker compose up -d postgres
   npx prisma generate
   npm run db:push
   npm run db:seed
   npm run dev
   ~~~
5. Open http://localhost:3000 and sign in using the owner email/password configured in .env.

Full Windows, database, CSV import, testing and deployment instructions: docs/SETUP.md. Set SEED_DEMO_DATA=false for a clean real inventory database; demo stock is opt-in only.

## Important
- Seeded Cosmosentials products and their quantities are sample records, not live stock.
- This GitHub repository is not connected to a live Cosmosentials database, Shopify, email/WhatsApp provider or production hosting.
- GST tax calculations are configurable but do not yet implement a complete Indian GST invoicing/compliance engine. Validate HSN, tax, place-of-supply and invoice rules with your accountant.
- Review security controls and complete production testing before using for business-critical transactions.
