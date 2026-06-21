-- AlterEnum
ALTER TYPE "ExpenseCategory" ADD VALUE 'COMMISSION';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "isPayrollExpense" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payrollRunId" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'RWF';

-- CreateIndex
CREATE INDEX "Expense_payrollRunId_idx" ON "Expense"("payrollRunId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
