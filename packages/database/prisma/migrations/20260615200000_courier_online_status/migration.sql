-- AlterTable
ALTER TABLE "courier_profiles"
ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onlineAt" TIMESTAMP(3),
ADD COLUMN "offlineAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "courier_profiles_isOnline_idx" ON "courier_profiles"("isOnline");
