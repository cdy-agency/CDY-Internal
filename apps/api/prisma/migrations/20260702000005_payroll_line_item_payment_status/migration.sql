DO $$ BEGIN
  CREATE TYPE "PayrollLineItemPaymentStatus" AS ENUM ('PENDING', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PayrollLineItem"
  ADD COLUMN IF NOT EXISTS "paymentStatus" "PayrollLineItemPaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paidBy" TEXT;

CREATE INDEX IF NOT EXISTS "PayrollLineItem_paymentStatus_idx" ON "PayrollLineItem"("paymentStatus");
