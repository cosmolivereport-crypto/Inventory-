# Inventory system scope and workflows

## Product and SKU policy
Every sellable variant has its own immutable unique SKU. Pack of 1, Pack of 2, Pack of 3 and Pack of 4 must be separate product records/SKUs. Never aggregate stock balances across different SKUs. Barcode is optional and unique when supplied.

## Core workflows
1. Product setup: category, brand, base unit, HSN, GST rate, MRP, selling price, purchase cost, reorder point, barcode and batch/expiry flags.
2. Opening stock: create batch and opening stock movement for each warehouse; retain source and operator.
3. Purchase: create PO/draft, approve, receive goods against supplier invoice, record batch/manufacturing/expiry, update stock balance and ledger in one database transaction.
4. Sales: create invoice, validate available quantity per warehouse/batch, allocate earliest-expiry eligible batch (FEFO), post negative stock movement and record payment.
5. Returns: receive sale return into a selected batch and inspect/segregate damaged goods; purchase returns reduce sellable stock and supplier balance.
6. Transfers: dispatch from source and receive at destination; track in-transit stock and never silently net warehouse quantities.
7. Adjustments: physical count, reason code, approval, before/after quantity and immutable audit movement.
8. Payments: customer receipts and supplier payments, partial settlements, references and outstanding balances.
9. Reporting: stock on hand/value, ledger, ageing, expiry buckets, dead stock, reorder, sales/purchase register, margins, GST summaries, receivables and payables.

## Safety and financial controls
- Post a document and all related ledger/balance/payment rows inside one serializable database transaction.
- Do not edit posted documents: use returns, reversals or credit/debit notes.
- Negative inventory is disabled by default. Any override requires an authorized role and audit entry.
- Do not delete ledger rows. Corrections are compensating movements.
- Store timestamps in UTC and display in Asia/Kolkata.
- Calculate tax from configurable place-of-supply and intra/inter-state rules; have an accountant validate current GST configuration before production.
- Use role checks on the server, not only hidden UI navigation.
- Maintain backups, restore tests, access logs, strong authentication and secret rotation.

## Release stages
- Stage 1 (current repository commit): foundation, schema, dashboard preview, sample catalogue, stock overview, product add UI, CSV export.
- Stage 2: authentication, Prisma client, migration and seed, transactional purchase/sales/return/transfer/adjustment APIs.
- Stage 3: complete screens for masters, documents, reports, GST invoices, permissions and audit logs.
- Stage 4: production hardening, automated tests, backups, monitoring and deployment.
