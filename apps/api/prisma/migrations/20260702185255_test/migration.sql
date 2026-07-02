-- CreateEnum ClientService (idempotent)
DO $$ BEGIN
    CREATE TYPE "ClientService" AS ENUM ('SOFTWARE_DEV', 'BRANDING', 'SOCIAL_MEDIA', 'INFLUENCER_MARKETING', 'SALES_SERVICES', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum: add DRAFT to RetainerStatus (idempotent via IF NOT EXISTS)
ALTER TYPE "RetainerStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

-- DropForeignKey (idempotent)
ALTER TABLE "MarketingClient" DROP CONSTRAINT IF EXISTS "MarketingClient_clientId_fkey";

-- DropIndex (idempotent)
DROP INDEX IF EXISTS "MarketingClient_clientId_key";

-- AlterTable
ALTER TABLE "CampaignInfluencer" ALTER COLUMN "currency" SET DEFAULT 'RWF';

-- AlterTable Client: drop text primaryService, recreate as ClientService enum
ALTER TABLE "Client" DROP COLUMN IF EXISTS "primaryService";
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "primaryService" "ClientService";

-- AlterTable DirectIncome: drop updatedAt default (no-op if already absent)
ALTER TABLE "DirectIncome" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable (idempotent)
DROP TABLE IF EXISTS "HourlyRate";

-- CreateIndex Bill unique on instalmentId
-- Drop the existing partial index (from finance_improvements) and recreate as
-- a full unique index so Prisma's schema introspection recognises it correctly.
DROP INDEX IF EXISTS "Bill_instalmentId_key";
CREATE UNIQUE INDEX "Bill_instalmentId_key" ON "Bill"("instalmentId");

-- CreateIndex Client_primaryService_idx (drop partial, recreate full)
DROP INDEX IF EXISTS "Client_primaryService_idx";
CREATE INDEX "Client_primaryService_idx" ON "Client"("primaryService");

-- CreateIndex Client_ventureId_idx (drop partial, recreate full)
DROP INDEX IF EXISTS "Client_ventureId_idx";
CREATE INDEX "Client_ventureId_idx" ON "Client"("ventureId");

-- AddForeignKey MarketingClient → Client (idempotent)
DO $$ BEGIN
    ALTER TABLE "MarketingClient" ADD CONSTRAINT "MarketingClient_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey MarketingClient → RetainerContract (idempotent)
DO $$ BEGIN
    ALTER TABLE "MarketingClient" ADD CONSTRAINT "MarketingClient_retainerId_fkey"
        FOREIGN KEY ("retainerId") REFERENCES "RetainerContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
