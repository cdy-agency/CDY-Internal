-- AlterTable RetainerContract — add missing ventureId column (schema drift fix)
ALTER TABLE "RetainerContract" ADD COLUMN IF NOT EXISTS "ventureId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RetainerContract_ventureId_idx" ON "RetainerContract"("ventureId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "RetainerContract" ADD CONSTRAINT "RetainerContract_ventureId_fkey"
    FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
