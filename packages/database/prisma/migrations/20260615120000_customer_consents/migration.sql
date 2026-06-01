-- CreateEnum
CREATE TYPE "CustomerConsentType" AS ENUM ('REGISTRATION_TERMS', 'MARKETING_ELECTRONIC');

-- CreateTable
CREATE TABLE "customer_consents" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "type" "CustomerConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'mobile_signup',

    CONSTRAINT "customer_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_consents_customerProfileId_type_recordedAt_idx" ON "customer_consents"("customerProfileId", "type", "recordedAt");

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
