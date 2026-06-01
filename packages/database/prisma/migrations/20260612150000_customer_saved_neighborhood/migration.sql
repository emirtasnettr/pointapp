-- Kayıtlı müşteri adresi: sistem mahalle kaydına bağlanır (İstanbul)
ALTER TABLE "customer_saved_addresses" ADD COLUMN "neighborhoodId" TEXT;

CREATE INDEX "customer_saved_addresses_neighborhoodId_idx" ON "customer_saved_addresses"("neighborhoodId");

ALTER TABLE "customer_saved_addresses" ADD CONSTRAINT "customer_saved_addresses_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
