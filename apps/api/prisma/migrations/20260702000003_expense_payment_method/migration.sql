ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;
