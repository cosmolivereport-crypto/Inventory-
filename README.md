# Cosmosentials Inventory Management System

A full-featured inventory and stock management application starter for Cosmosentials.

## Planned modules
- Dashboard with stock valuation, sales, purchases, low-stock and expiry KPIs
- Product catalogue, categories, brands, units, variants, SKU/barcodes
- Multi-warehouse stock, stock ledger, transfers and physical stock adjustments
- Purchase orders, goods receipts, supplier invoices and supplier payments
- Sales orders, invoices, customer records and payment tracking
- Sales returns, purchase returns and credit/debit notes
- Batch/lot tracking, manufacturing and expiry dates, FEFO support
- Reorder levels, low/out-of-stock alerts and dead-stock reports
- GST-ready tax configuration, discounts and configurable invoice numbering
- Expenses, cash/bank accounts and basic profit reports
- Role-based access, audit trail, CSV import/export and backups

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- Zod validation
- Recharts for analytics

## Getting started
1. Install Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run `npm install`.
4. Run `npx prisma migrate dev --name init`.
5. Run `npm run dev`.

See `docs/IMPLEMENTATION.md` for scope and operational workflows.

> Important: This repository is being initialized from an empty repository. Configure production authentication, backups, tax rules and permissions before using it for live financial records.
