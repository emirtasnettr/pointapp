-- CreateEnum
CREATE TYPE "CourierConsentType" AS ENUM ('REGISTRATION_TERMS', 'MARKETING_NOTIFICATIONS');

-- CreateTable
CREATE TABLE "courier_consents" (
    "id" TEXT NOT NULL,
    "courierProfileId" TEXT NOT NULL,
    "type" "CourierConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'mobile_onboarding',

    CONSTRAINT "courier_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_consents_courierProfileId_type_recordedAt_idx" ON "courier_consents"("courierProfileId", "type", "recordedAt");

-- AddForeignKey
ALTER TABLE "courier_consents" ADD CONSTRAINT "courier_consents_courierProfileId_fkey" FOREIGN KEY ("courierProfileId") REFERENCES "courier_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
