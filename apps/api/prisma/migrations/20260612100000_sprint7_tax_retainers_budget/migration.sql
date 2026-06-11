-- CreateEnum
CREATE TYPE "RetainerStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "BudgetRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ratePercent" DECIMAL(5,2) NOT NULL,
    "country" TEXT NOT NULL,
    "serviceType" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPayment" (
    "id" TEXT NOT NULL,
    "authorityName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetainerContract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingDayOfMonth" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "RetainerStatus" NOT NULL DEFAULT 'ACTIVE',
    "taxRateId" TEXT,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "lastBilledAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetainerContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBudget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "approvedBudget" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "alertThresholdPct" INTEGER NOT NULL DEFAULT 80,
    "alertSentAt" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetIncreaseRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "currentBudget" DECIMAL(12,2) NOT NULL,
    "requestedBudget" DECIMAL(12,2) NOT NULL,
    "justification" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" "BudgetRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetIncreaseRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "taxRateId" TEXT,
ADD COLUMN "retainerContractId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "internalHourlyCost" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "TaxRate_country_idx" ON "TaxRate"("country");
CREATE INDEX "TaxRate_serviceType_idx" ON "TaxRate"("serviceType");
CREATE INDEX "TaxRate_isActive_idx" ON "TaxRate"("isActive");
CREATE INDEX "TaxPayment_paidAt_idx" ON "TaxPayment"("paidAt");
CREATE INDEX "TaxPayment_periodFrom_idx" ON "TaxPayment"("periodFrom");
CREATE INDEX "RetainerContract_status_idx" ON "RetainerContract"("status");
CREATE INDEX "RetainerContract_nextBillingDate_idx" ON "RetainerContract"("nextBillingDate");
CREATE INDEX "RetainerContract_clientId_idx" ON "RetainerContract"("clientId");
CREATE INDEX "ProjectBudget_projectId_idx" ON "ProjectBudget"("projectId");
CREATE INDEX "ProjectBudget_clientId_idx" ON "ProjectBudget"("clientId");
CREATE UNIQUE INDEX "ProjectBudget_projectId_key" ON "ProjectBudget"("projectId");
CREATE INDEX "BudgetIncreaseRequest_projectId_idx" ON "BudgetIncreaseRequest"("projectId");
CREATE INDEX "BudgetIncreaseRequest_status_idx" ON "BudgetIncreaseRequest"("status");
CREATE INDEX "Invoice_taxRateId_idx" ON "Invoice"("taxRateId");
CREATE INDEX "Invoice_retainerContractId_idx" ON "Invoice"("retainerContractId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_retainerContractId_fkey" FOREIGN KEY ("retainerContractId") REFERENCES "RetainerContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RetainerContract" ADD CONSTRAINT "RetainerContract_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BudgetIncreaseRequest" ADD CONSTRAINT "BudgetIncreaseRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectBudget"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;
