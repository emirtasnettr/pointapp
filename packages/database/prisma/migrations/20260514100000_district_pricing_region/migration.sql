-- İlçe → fiyat matrisi bölgesi (IST-PZ…); coğrafya TR-34 ayrı kalır.
ALTER TABLE "districts" ADD COLUMN "pricingRegionId" TEXT;

UPDATE "districts" AS d
SET "pricingRegionId" = sub.id
FROM (
  SELECT r.id
  FROM "regions" AS r
  WHERE r.code LIKE 'IST-PZ%'
  ORDER BY r.code ASC
  LIMIT 1
) AS sub;

ALTER TABLE "districts" ALTER COLUMN "pricingRegionId" SET NOT NULL;

ALTER TABLE "districts" ADD CONSTRAINT "districts_pricingRegionId_fkey" FOREIGN KEY ("pricingRegionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "districts_pricingRegionId_idx" ON "districts"("pricingRegionId");
