ALTER TABLE "DirectIncome" ADD COLUMN IF NOT EXISTS "ventureId" TEXT;

CREATE INDEX IF NOT EXISTS "DirectIncome_ventureId_idx" ON "DirectIncome"("ventureId");
