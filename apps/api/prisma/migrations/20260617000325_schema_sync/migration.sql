-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "serviceType" TEXT NOT NULL DEFAULT 'general';

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "serviceType" TEXT,
    "ratePercent" DECIMAL(5,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRecord" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "dealValue" DECIMAL(12,2) NOT NULL,
    "serviceType" TEXT NOT NULL,
    "ratePercent" DECIMAL(5,2) NOT NULL,
    "calculatedAmount" DECIMAL(12,2) NOT NULL,
    "adjustedAmount" DECIMAL(12,2),
    "adjustmentReason" TEXT,
    "month" TEXT NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionRule_agentId_idx" ON "CommissionRule"("agentId");

-- CreateIndex
CREATE INDEX "CommissionRule_effectiveFrom_idx" ON "CommissionRule"("effectiveFrom");

-- CreateIndex
CREATE INDEX "CommissionRule_agentId_serviceType_idx" ON "CommissionRule"("agentId", "serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRecord_dealId_key" ON "CommissionRecord"("dealId");

-- CreateIndex
CREATE INDEX "CommissionRecord_agentId_idx" ON "CommissionRecord"("agentId");

-- CreateIndex
CREATE INDEX "CommissionRecord_month_idx" ON "CommissionRecord"("month");

-- CreateIndex
CREATE INDEX "CommissionRecord_status_idx" ON "CommissionRecord"("status");

-- CreateIndex
CREATE INDEX "CommissionRecord_month_status_idx" ON "CommissionRecord"("month", "status");

-- CreateIndex
CREATE INDEX "Invoice_serviceType_idx" ON "Invoice"("serviceType");

-- CreateIndex
CREATE INDEX "Invoice_paidAt_idx" ON "Invoice"("paidAt");

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
