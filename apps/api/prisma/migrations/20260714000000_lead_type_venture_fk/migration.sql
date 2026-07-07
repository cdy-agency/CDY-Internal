-- Lead model: add leadType, make companyName nullable, default serviceInterest, add ventureId FK

-- 1. Add leadType column (uses existing ClientType enum)
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "leadType" "ClientType" NOT NULL DEFAULT 'COMPANY';

-- 2. Make companyName nullable (was NOT NULL)
ALTER TABLE "Lead" ALTER COLUMN "companyName" DROP NOT NULL;

-- 3. Set default on serviceInterest so new rows don't require it
ALTER TABLE "Lead" ALTER COLUMN "serviceInterest" SET DEFAULT '';

-- 4. Add ventureId nullable FK column
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "ventureId" TEXT;

-- 5. Index on ventureId
CREATE INDEX IF NOT EXISTS "Lead_ventureId_idx" ON "Lead"("ventureId");

-- 6. Foreign key to Venture
DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ventureId_fkey"
    FOREIGN KEY ("ventureId") REFERENCES "Venture"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
