-- Şahıs işletmesi müşteri tipi + vergi numarası tekilliği
ALTER TYPE "CustomerType" ADD VALUE 'SOLE_PROPRIETOR';

CREATE UNIQUE INDEX "customer_profiles_taxNumber_key" ON "customer_profiles"("taxNumber");
