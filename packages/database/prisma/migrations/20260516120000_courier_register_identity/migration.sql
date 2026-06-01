-- AlterTable
ALTER TABLE "users" ADD COLUMN "birthDate" DATE;

-- CreateEnum
CREATE TYPE "CourierMerchantCompanyType" AS ENUM ('SOLE_PROPRIETORSHIP', 'JOINT_STOCK', 'LIMITED');

-- AlterTable
ALTER TABLE "courier_profiles" ADD COLUMN "merchantCompanyType" "CourierMerchantCompanyType",
ADD COLUMN "taxNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "courier_profiles_taxNumber_key" ON "courier_profiles"("taxNumber");
