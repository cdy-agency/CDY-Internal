-- Soft-delete columns + indexes.
-- Skips tables that do not exist yet (e.g. ProjectReport is created in a later migration).

CREATE OR REPLACE FUNCTION prisma_tmp_add_deleted_at(tbl text) RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = tbl
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)', tbl);
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prisma_tmp_add_deleted_at_idx(tbl text, idx text) RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = tbl
  ) THEN
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I ("deletedAt")', idx, tbl);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT prisma_tmp_add_deleted_at('AttendanceRecord');
SELECT prisma_tmp_add_deleted_at('BankStatement');
SELECT prisma_tmp_add_deleted_at('BrandingProject');
SELECT prisma_tmp_add_deleted_at('BrandingScopeItem');
SELECT prisma_tmp_add_deleted_at('BrandingSupplier');
SELECT prisma_tmp_add_deleted_at('BudgetIncreaseRequest');
SELECT prisma_tmp_add_deleted_at('Bug');
SELECT prisma_tmp_add_deleted_at('CampaignInfluencer');
SELECT prisma_tmp_add_deleted_at('CommissionRecord');
SELECT prisma_tmp_add_deleted_at('CommissionRule');
SELECT prisma_tmp_add_deleted_at('DailyActivityLog');
SELECT prisma_tmp_add_deleted_at('Deliverable');
SELECT prisma_tmp_add_deleted_at('DeliverableApproval');
SELECT prisma_tmp_add_deleted_at('Department');
SELECT prisma_tmp_add_deleted_at('DesignSubmission');
SELECT prisma_tmp_add_deleted_at('DevSprint');
SELECT prisma_tmp_add_deleted_at('Influencer');
SELECT prisma_tmp_add_deleted_at('InfluencerCampaign');
SELECT prisma_tmp_add_deleted_at('LeadActivity');
SELECT prisma_tmp_add_deleted_at('LeaveRequest');
SELECT prisma_tmp_add_deleted_at('LeaveType');
SELECT prisma_tmp_add_deleted_at('MaintenanceLog');
SELECT prisma_tmp_add_deleted_at('MarketingClient');
SELECT prisma_tmp_add_deleted_at('Milestone');
SELECT prisma_tmp_add_deleted_at('Notification');
SELECT prisma_tmp_add_deleted_at('OnboardingChecklist');
SELECT prisma_tmp_add_deleted_at('PaymentPlan');
SELECT prisma_tmp_add_deleted_at('PaymentPlanItem');
SELECT prisma_tmp_add_deleted_at('PayrollRun');
SELECT prisma_tmp_add_deleted_at('PerformanceReview');
SELECT prisma_tmp_add_deleted_at('ProjectBudget');
SELECT prisma_tmp_add_deleted_at('ProjectFile');
SELECT prisma_tmp_add_deleted_at('ProjectMember');
SELECT prisma_tmp_add_deleted_at('ProjectReport');
SELECT prisma_tmp_add_deleted_at('Proposal');
SELECT prisma_tmp_add_deleted_at('RequirementDoc');
SELECT prisma_tmp_add_deleted_at('RetainerContract');
SELECT prisma_tmp_add_deleted_at('SalesAgent');
SELECT prisma_tmp_add_deleted_at('SalesCampaign');
SELECT prisma_tmp_add_deleted_at('SalesTarget');
SELECT prisma_tmp_add_deleted_at('SavedFilter');
SELECT prisma_tmp_add_deleted_at('SoftwareProject');
SELECT prisma_tmp_add_deleted_at('SprintItem');
SELECT prisma_tmp_add_deleted_at('TaxPayment');
SELECT prisma_tmp_add_deleted_at('TaxRate');
SELECT prisma_tmp_add_deleted_at('Venture');
SELECT prisma_tmp_add_deleted_at('WeeklyReport');
SELECT prisma_tmp_add_deleted_at('roles');

SELECT prisma_tmp_add_deleted_at_idx('AttendanceRecord', 'AttendanceRecord_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('BalanceSheetEntry', 'BalanceSheetEntry_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('BankStatement', 'BankStatement_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Bill', 'Bill_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('BrandingProject', 'BrandingProject_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('BrandingScopeItem', 'BrandingScopeItem_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('BrandingSupplier', 'BrandingSupplier_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('BudgetIncreaseRequest', 'BudgetIncreaseRequest_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Bug', 'Bug_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('CampaignInfluencer', 'CampaignInfluencer_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('CashFlowAdjustment', 'CashFlowAdjustment_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Client', 'Client_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('CommissionRecord', 'CommissionRecord_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('CommissionRule', 'CommissionRule_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('ContentItem', 'ContentItem_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('CreditNote', 'CreditNote_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('DailyActivityLog', 'DailyActivityLog_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Deliverable', 'Deliverable_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('DeliverableApproval', 'DeliverableApproval_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Department', 'Department_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('DesignSubmission', 'DesignSubmission_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('DevSprint', 'DevSprint_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('DirectIncome', 'DirectIncome_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Employee', 'Employee_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Expense', 'Expense_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Influencer', 'Influencer_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('InfluencerCampaign', 'InfluencerCampaign_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Invoice', 'Invoice_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Lead', 'Lead_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('LeadActivity', 'LeadActivity_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('LeaveRequest', 'LeaveRequest_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('LeaveType', 'LeaveType_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('MaintenanceLog', 'MaintenanceLog_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('MarketingClient', 'MarketingClient_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Milestone', 'Milestone_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Notification', 'Notification_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('OnboardingChecklist', 'OnboardingChecklist_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Payment', 'Payment_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('PaymentPlan', 'PaymentPlan_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('PaymentPlanItem', 'PaymentPlanItem_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('PayrollRun', 'PayrollRun_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('PerformanceReview', 'PerformanceReview_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Project', 'Project_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('ProjectBudget', 'ProjectBudget_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('ProjectFile', 'ProjectFile_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('ProjectMember', 'ProjectMember_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('ProjectReport', 'ProjectReport_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Proposal', 'Proposal_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('RequirementDoc', 'RequirementDoc_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('RetainerContract', 'RetainerContract_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('SalesAgent', 'SalesAgent_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('SalesCampaign', 'SalesCampaign_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('SalesTarget', 'SalesTarget_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('SavedFilter', 'SavedFilter_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('SoftwareProject', 'SoftwareProject_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('SprintItem', 'SprintItem_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Task', 'Task_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('TaskComment', 'TaskComment_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('TaxPayment', 'TaxPayment_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('TaxRate', 'TaxRate_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('User', 'User_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('Venture', 'Venture_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('VentureExpense', 'VentureExpense_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('VentureIncome', 'VentureIncome_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('WeeklyReport', 'WeeklyReport_deletedAt_idx');
SELECT prisma_tmp_add_deleted_at_idx('roles', 'roles_deletedAt_idx');

DROP FUNCTION prisma_tmp_add_deleted_at(text);
DROP FUNCTION prisma_tmp_add_deleted_at_idx(text, text);
