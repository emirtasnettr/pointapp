-- AlterEnum
ALTER TYPE "SmsOtpPurpose" ADD VALUE 'TRACK_DELIVERY';

-- CreateTable
CREATE TABLE "auth_handoff_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_handoff_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_handoff_codes_userId_createdAt_idx" ON "auth_handoff_codes"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "auth_handoff_codes" ADD CONSTRAINT "auth_handoff_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
