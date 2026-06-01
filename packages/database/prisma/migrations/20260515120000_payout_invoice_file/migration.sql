-- AlterTable
ALTER TABLE "payout_requests" ADD COLUMN "invoiceFileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payout_requests_invoiceFileId_key" ON "payout_requests"("invoiceFileId");

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_invoiceFileId_fkey" FOREIGN KEY ("invoiceFileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
