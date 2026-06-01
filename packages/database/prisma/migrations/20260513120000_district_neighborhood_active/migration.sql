-- Pasif ilçe/mahalle; teslimat talebinde listelenmez; kayıtlı adreslerde uyarı için kullanılır.
ALTER TABLE "districts" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "neighborhoods" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "districts_regionId_active_idx" ON "districts"("regionId", "active");
CREATE INDEX "neighborhoods_districtId_active_idx" ON "neighborhoods"("districtId", "active");
