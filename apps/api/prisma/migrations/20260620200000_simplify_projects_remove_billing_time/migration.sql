-- SimplifyProjects: remove billing-per-milestone, time tracking, profitability
-- Step 1: nullify milestoneId on invoices so we can drop the column
UPDATE "Invoice" SET "milestoneId" = NULL WHERE "milestoneId" IS NOT NULL;

-- Step 2: update APPROVED/INVOICED milestones to COMPLETED before altering enum
UPDATE "Milestone" SET "status" = 'COMPLETED' WHERE "status" IN ('APPROVED', 'INVOICED');

-- Step 3: Alter MilestoneStatus enum — remove APPROVED and INVOICED
ALTER TYPE "MilestoneStatus" RENAME TO "MilestoneStatus_old";
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
ALTER TABLE "Milestone" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Milestone" ALTER COLUMN "status" TYPE "MilestoneStatus" USING "status"::text::"MilestoneStatus";
ALTER TABLE "Milestone" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "MilestoneStatus_old";

-- Step 4: Remove billing fields from Milestone
ALTER TABLE "Milestone" DROP COLUMN IF EXISTS "billingAmount";
ALTER TABLE "Milestone" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "Milestone" DROP COLUMN IF EXISTS "approvedAt";
ALTER TABLE "Milestone" DROP COLUMN IF EXISTS "approvedBy";

-- Step 5: Remove milestoneId from Invoice
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_milestoneId_key";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "milestoneId";

-- Step 6: Replace estimatedBudget with totalCost and add invoiceId on Project
ALTER TABLE "Project" RENAME COLUMN "estimatedBudget" TO "totalCost";
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;

-- Step 7: Drop TimeEntry table (drop foreign key references first)
DROP TABLE IF EXISTS "TimeEntry" CASCADE;

-- Step 8: Drop HourlyRate table
DROP TABLE IF EXISTS "HourlyRate" CASCADE;
