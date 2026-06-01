-- DropIndex
DROP INDEX "payout_requests_invoiceFileId_key";

-- AlterTable
ALTER TABLE "customer_saved_addresses" ALTER COLUMN "updatedAt" DROP DEFAULT;
