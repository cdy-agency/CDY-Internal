-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "ventureId" TEXT,
ADD COLUMN     "ventureSharePercent" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "ventureId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_ventureId_idx" ON "Expense"("ventureId");

-- CreateIndex
CREATE INDEX "Invoice_ventureId_idx" ON "Invoice"("ventureId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
