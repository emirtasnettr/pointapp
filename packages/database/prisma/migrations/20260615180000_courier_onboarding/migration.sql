-- CreateEnum
CREATE TYPE "CourierOnboardingStatus" AS ENUM ('DOCUMENTS_REQUIRED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CourierDocumentFieldKind" AS ENUM ('FILE', 'TEXT');

-- AlterTable
ALTER TABLE "courier_profiles" ADD COLUMN "onboardingStatus" "CourierOnboardingStatus" NOT NULL DEFAULT 'DOCUMENTS_REQUIRED';
ALTER TABLE "courier_profiles" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "courier_profiles" ADD COLUMN "submittedForReviewAt" TIMESTAMP(3);
ALTER TABLE "courier_profiles" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "courier_profiles" ADD COLUMN "reviewedByUserId" TEXT;

-- Mevcut aktif kuryeler onaylı sayılır
UPDATE "courier_profiles" cp
SET "onboardingStatus" = 'APPROVED'
FROM "users" u
WHERE cp."userId" = u.id AND u.status = 'ACTIVE';

-- CreateTable
CREATE TABLE "courier_document_requirements" (
    "id" TEXT NOT NULL,
    "courierType" "CourierType" NOT NULL,
    "kind" "CourierDocumentFieldKind" NOT NULL,
    "label" TEXT NOT NULL,
    "hint" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_document_submissions" (
    "id" TEXT NOT NULL,
    "courierProfileId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "textValue" TEXT,
    "fileUrl" TEXT,
    "fileStorageKey" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_document_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_profiles_onboardingStatus_submittedForReviewAt_idx" ON "courier_profiles"("onboardingStatus", "submittedForReviewAt");

-- CreateIndex
CREATE INDEX "courier_document_requirements_courierType_active_sortOrder_idx" ON "courier_document_requirements"("courierType", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "courier_document_submissions_courierProfileId_requirementId_key" ON "courier_document_submissions"("courierProfileId", "requirementId");

-- AddForeignKey
ALTER TABLE "courier_profiles" ADD CONSTRAINT "courier_profiles_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_document_submissions" ADD CONSTRAINT "courier_document_submissions_courierProfileId_fkey" FOREIGN KEY ("courierProfileId") REFERENCES "courier_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_document_submissions" ADD CONSTRAINT "courier_document_submissions_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "courier_document_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
