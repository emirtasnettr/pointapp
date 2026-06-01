-- Müşteri kayıtlı adres defteri
CREATE TABLE "customer_saved_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'İstanbul',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_saved_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_saved_addresses_customerId_sortOrder_idx" ON "customer_saved_addresses"("customerId", "sortOrder");

ALTER TABLE "customer_saved_addresses" ADD CONSTRAINT "customer_saved_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
