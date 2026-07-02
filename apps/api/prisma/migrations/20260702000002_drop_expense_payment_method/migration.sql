-- AlterTable: remove expensePaymentMethod from Expense
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "expensePaymentMethod";

-- DropEnum: ExpensePaymentMethod no longer used
DROP TYPE IF EXISTS "ExpensePaymentMethod";
