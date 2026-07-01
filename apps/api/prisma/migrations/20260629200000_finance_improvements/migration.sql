-- ─── Finance Improvements Migration (idempotent) ──────────────────────────────
-- Adds: DirectIncome, RetainerExtension, Bill.instalmentId, RetainerContract extensions
-- All statements are idempotent so re-running after a partial failure is safe.

-- CreateTable DirectIncome
CREATE TABLE IF NOT EXISTS "DirectIncome" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DirectIncome_pkey" PRIMARY KEY ("id")
);

-- CreateTable RetainerExtension
CREATE TABLE IF NOT EXISTS "RetainerExtension" (
    "id" TEXT NOT NULL,
    "retainerContractId" TEXT NOT NULL,
    "previousEndDate" TIMESTAMP(3),
    "newEndDate" TIMESTAMP(3),
    "previousAmount" DECIMAL(12,2) NOT NULL,
    "newAmount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "extendedBy" TEXT NOT NULL,
    "extendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetainerExtension_pkey" PRIMARY KEY ("id")
);

-- AlterTable Bill — add instalmentId
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "instalmentId" TEXT;

-- AlterTable RetainerContract — add extension fields
ALTER TABLE "RetainerContract"
    ADD COLUMN IF NOT EXISTS "originalEndDate" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "extensionCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- AlterTable Client — add ventureId
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "ventureId" TEXT;

-- AlterTable Client — make companyName nullable (idempotent in PostgreSQL)
ALTER TABLE "Client" ALTER COLUMN "companyName" DROP NOT NULL;

-- AlterTable Client — add clientType enum if missing
DO $$ BEGIN
    CREATE TYPE "ClientType" AS ENUM ('COMPANY', 'INDIVIDUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "clientType" "ClientType" NOT NULL DEFAULT 'COMPANY';

-- AlterTable Client — add other missing columns
ALTER TABLE "Client"
    ADD COLUMN IF NOT EXISTS "primaryService" TEXT,
    ADD COLUMN IF NOT EXISTS "serviceValue" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "serviceCurrency" TEXT DEFAULT 'RWF',
    ADD COLUMN IF NOT EXISTS "softwareProjectId" TEXT,
    ADD COLUMN IF NOT EXISTS "brandingProjectId" TEXT,
    ADD COLUMN IF NOT EXISTS "projectId" TEXT,
    ADD COLUMN IF NOT EXISTS "influencerCampaignId" TEXT,
    ADD COLUMN IF NOT EXISTS "salesCampaignId" TEXT;

-- AlterTable Expense — add expensePaymentMethod and paymentReference
DO $$ BEGIN
    CREATE TYPE "ExpensePaymentMethod" AS ENUM ('BANK_TRANSFER', 'MTN_MOMO', 'AIRTEL_MONEY', 'CARD', 'CASH', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "Expense"
    ADD COLUMN IF NOT EXISTS "expensePaymentMethod" "ExpensePaymentMethod",
    ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "DirectIncome_clientId_idx" ON "DirectIncome"("clientId");
CREATE INDEX IF NOT EXISTS "DirectIncome_date_idx" ON "DirectIncome"("date");
CREATE INDEX IF NOT EXISTS "DirectIncome_paymentMethod_idx" ON "DirectIncome"("paymentMethod");
CREATE INDEX IF NOT EXISTS "RetainerExtension_retainerContractId_idx" ON "RetainerExtension"("retainerContractId");
CREATE UNIQUE INDEX IF NOT EXISTS "Bill_instalmentId_key" ON "Bill"("instalmentId") WHERE "instalmentId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Bill_instalmentId_idx" ON "Bill"("instalmentId");
CREATE INDEX IF NOT EXISTS "Client_ventureId_idx" ON "Client"("ventureId") WHERE "ventureId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Client_clientType_idx" ON "Client"("clientType");
CREATE INDEX IF NOT EXISTS "Client_primaryService_idx" ON "Client"("primaryService");

-- AddForeignKey DirectIncome → Client (idempotent)
DO $$ BEGIN
    ALTER TABLE "DirectIncome" ADD CONSTRAINT "DirectIncome_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey DirectIncome → User (idempotent)
DO $$ BEGIN
    ALTER TABLE "DirectIncome" ADD CONSTRAINT "DirectIncome_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey RetainerExtension → RetainerContract (idempotent)
DO $$ BEGIN
    ALTER TABLE "RetainerExtension" ADD CONSTRAINT "RetainerExtension_retainerContractId_fkey"
        FOREIGN KEY ("retainerContractId") REFERENCES "RetainerContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey Bill → PaymentPlanItem (idempotent)
DO $$ BEGIN
    ALTER TABLE "Bill" ADD CONSTRAINT "Bill_instalmentId_fkey"
        FOREIGN KEY ("instalmentId") REFERENCES "PaymentPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey Client → Venture (idempotent)
ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_ventureId_fkey";
ALTER TABLE "Client" ADD CONSTRAINT "Client_ventureId_fkey"
    FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
