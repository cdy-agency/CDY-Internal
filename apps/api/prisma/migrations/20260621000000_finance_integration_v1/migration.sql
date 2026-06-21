-- This migration contains statements that are NOT possible to wrap in a transaction:
-- - "ALTER TYPE ... ADD VALUE" cannot run inside a transaction block.

-- AlterEnum: add INFLUENCER_PAYMENT to ExpenseCategory
ALTER TYPE "ExpenseCategory" ADD VALUE 'INFLUENCER_PAYMENT' AFTER 'COMMISSION';

-- AlterTable: SoftwareProject — add totalCost, currency, invoiceId
ALTER TABLE "SoftwareProject"
  ADD COLUMN "totalCost" DECIMAL(12,2),
  ADD COLUMN "currency"  TEXT NOT NULL DEFAULT 'RWF',
  ADD COLUMN "invoiceId" TEXT;

-- AlterTable: BrandingProject — add totalCost, currency, invoiceId
ALTER TABLE "BrandingProject"
  ADD COLUMN "totalCost" DECIMAL(12,2),
  ADD COLUMN "currency"  TEXT NOT NULL DEFAULT 'RWF',
  ADD COLUMN "invoiceId" TEXT;

-- AlterTable: InfluencerCampaign — add totalCost, invoiceId
ALTER TABLE "InfluencerCampaign"
  ADD COLUMN "totalCost" DECIMAL(12,2),
  ADD COLUMN "invoiceId" TEXT;

-- AlterTable: CampaignInfluencer — add expenseId
ALTER TABLE "CampaignInfluencer"
  ADD COLUMN "expenseId" TEXT;

-- AlterTable: SalesCampaign — add totalCost, currency, invoiceId
ALTER TABLE "SalesCampaign"
  ADD COLUMN "totalCost" DECIMAL(12,2),
  ADD COLUMN "currency"  TEXT NOT NULL DEFAULT 'RWF',
  ADD COLUMN "invoiceId" TEXT;

-- AlterTable: MarketingClient — clientId becomes nullable, retainerId becomes unique + required
-- Step 1: remove old clientId unique constraint
ALTER TABLE "MarketingClient" DROP CONSTRAINT IF EXISTS "MarketingClient_clientId_key";

-- Step 2: make clientId nullable
ALTER TABLE "MarketingClient" ALTER COLUMN "clientId" DROP NOT NULL;

-- Step 3: for rows with null retainerId (legacy), remove their content items then delete them.
DELETE FROM "ContentItem" WHERE "marketingClientId" IN (
  SELECT id FROM "MarketingClient" WHERE "retainerId" IS NULL
);
DELETE FROM "MarketingClient" WHERE "retainerId" IS NULL;

-- Step 4: make retainerId NOT NULL
ALTER TABLE "MarketingClient" ALTER COLUMN "retainerId" SET NOT NULL;

-- Step 5: add unique constraint on retainerId
ALTER TABLE "MarketingClient" ADD CONSTRAINT "MarketingClient_retainerId_key" UNIQUE ("retainerId");
