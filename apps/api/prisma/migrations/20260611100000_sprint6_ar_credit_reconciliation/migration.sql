-- CreateEnum
CREATE TYPE "WriteOffCategory" AS ENUM ('CLIENT_DISPUTE', 'CLIENT_INSOLVENT', 'AGREED_WRITE_OFF', 'UNCOLLECTABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "CreditNoteReason" AS ENUM ('OVERCHARGE', 'SERVICE_NOT_DELIVERED', 'DISCOUNT_AGREED', 'REFUND_APPROVED', 'OTHER');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('ISSUED', 'REFUND_PENDING', 'REFUND_PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstalmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "TransactionMatchStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'MANUALLY_RESOLVED', 'IGNORED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "writeOffReason" TEXT,
ADD COLUMN "writeOffCategory" "WriteOffCategory",
ADD COLUMN "creditTermsDays" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" "CreditNoteReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundDue" BOOLEAN NOT NULL DEFAULT false,
    "refundPaidAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlanItem" (
    "id" TEXT NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "instalmentNumber" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InstalmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentId" TEXT,

    CONSTRAINT "PaymentPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedBy" TEXT NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completedAt" TIMESTAMP(3),
    "openingBalance" DECIMAL(12,2) NOT NULL,
    "closingBalance" DECIMAL(12,2) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "unmatchedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "bankStatementId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "debitAmount" DECIMAL(12,2),
    "creditAmount" DECIMAL(12,2),
    "balance" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "matchStatus" "TransactionMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchedEntityType" TEXT,
    "matchedEntityId" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedNote" TEXT,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_creditNoteNumber_key" ON "CreditNote"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");

-- CreateIndex
CREATE INDEX "CreditNote_createdAt_idx" ON "CreditNote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentPlan_invoiceId_key" ON "PaymentPlan"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentPlanItem_paymentPlanId_idx" ON "PaymentPlanItem"("paymentPlanId");

-- CreateIndex
CREATE INDEX "PaymentPlanItem_dueDate_idx" ON "PaymentPlanItem"("dueDate");

-- CreateIndex
CREATE INDEX "PaymentPlanItem_status_idx" ON "PaymentPlanItem"("status");

-- CreateIndex
CREATE INDEX "BankStatement_periodFrom_idx" ON "BankStatement"("periodFrom");

-- CreateIndex
CREATE INDEX "BankTransaction_bankStatementId_idx" ON "BankTransaction"("bankStatementId");

-- CreateIndex
CREATE INDEX "BankTransaction_matchStatus_idx" ON "BankTransaction"("matchStatus");

-- CreateIndex
CREATE INDEX "BankTransaction_transactionDate_idx" ON "BankTransaction"("transactionDate");

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlanItem" ADD CONSTRAINT "PaymentPlanItem_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
