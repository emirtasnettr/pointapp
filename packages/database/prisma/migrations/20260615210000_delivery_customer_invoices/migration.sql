-- Drop legacy unused invoices table
DROP TABLE IF EXISTS "invoices";

-- CreateTable
CREATE TABLE "delivery_customer_invoices" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "invoiceNumber" VARCHAR(64),
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_customer_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_customer_invoice_deliveries" (
    "invoiceId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,

    CONSTRAINT "delivery_customer_invoice_deliveries_pkey" PRIMARY KEY ("invoiceId","deliveryId")
);

CREATE INDEX "delivery_customer_invoices_customerId_createdAt_idx" ON "delivery_customer_invoices"("customerId", "createdAt");

CREATE INDEX "delivery_customer_invoice_deliveries_deliveryId_idx" ON "delivery_customer_invoice_deliveries"("deliveryId");

ALTER TABLE "delivery_customer_invoices" ADD CONSTRAINT "delivery_customer_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_customer_invoices" ADD CONSTRAINT "delivery_customer_invoices_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_customer_invoices" ADD CONSTRAINT "delivery_customer_invoices_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "delivery_customer_invoice_deliveries" ADD CONSTRAINT "delivery_customer_invoice_deliveries_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "delivery_customer_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_customer_invoice_deliveries" ADD CONSTRAINT "delivery_customer_invoice_deliveries_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
