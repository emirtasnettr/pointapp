-- CreateEnum
CREATE TYPE "CourierDocumentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "courier_document_submissions"
ADD COLUMN "reviewStatus" "CourierDocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "courier_document_submissions_courierProfileId_reviewStatus_idx" ON "courier_document_submissions"("courierProfileId", "reviewStatus");

-- AddForeignKey
ALTER TABLE "courier_document_submissions" ADD CONSTRAINT "courier_document_submissions_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Mevcut onaylı kuryelerin evraklarını onaylı say
UPDATE "courier_document_submissions" s
SET "reviewStatus" = 'APPROVED'
FROM "courier_profiles" p
WHERE s."courierProfileId" = p.id AND p."onboardingStatus" = 'APPROVED';
