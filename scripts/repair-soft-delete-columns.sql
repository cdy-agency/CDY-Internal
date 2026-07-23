-- Force-add deletedAt on every public table that Prisma soft-deletes.
-- Safe to re-run.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'AttendanceRecord','BalanceSheetEntry','BankStatement','Bill',
    'BrandingProject','BrandingScopeItem','BrandingSupplier','BudgetIncreaseRequest',
    'Bug','CampaignInfluencer','CashFlowAdjustment','Client','CommissionRecord',
    'CommissionRule','ContentItem','CreditNote','DailyActivityLog','Deliverable',
    'DeliverableApproval','Department','DesignSubmission','DevSprint','DirectIncome',
    'Employee','Expense','Influencer','InfluencerCampaign','Invoice','Lead',
    'LeadActivity','LeaveRequest','LeaveType','MaintenanceLog','MarketingClient',
    'Milestone','Notification','OnboardingChecklist','Payment','PaymentPlan',
    'PaymentPlanItem','PayrollRun','PerformanceReview','Project','ProjectBudget',
    'ProjectFile','ProjectMember','ProjectReport','Proposal','RequirementDoc',
    'RetainerContract','SalesAgent','SalesCampaign','SalesTarget','SavedFilter',
    'SoftwareProject','SprintItem','Task','TaskComment','TaxPayment','TaxRate',
    'User','Venture','VentureExpense','VentureIncome','WeeklyReport','roles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      -- Drop wrong-case column if a prior unquoted add created "deletedat"
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'deletedat'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'deletedAt'
      ) THEN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN deletedat TO "deletedAt"', t);
      END IF;

      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I ("deletedAt")', t || '_deletedAt_idx', t);
    END IF;
  END LOOP;
END $$;

-- Prove roles.deletedAt exists with exact case Prisma expects
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'roles'
  AND column_name IN ('deletedAt', 'deletedat');
