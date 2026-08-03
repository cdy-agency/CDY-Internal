-- Add LOAN as a valid Expense category, so loan repayments no longer have
-- to be forced into the generic OTHER bucket.
ALTER TYPE "ExpenseCategory" ADD VALUE 'LOAN';
