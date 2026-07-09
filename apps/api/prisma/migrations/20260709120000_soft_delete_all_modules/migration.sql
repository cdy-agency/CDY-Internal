-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BankStatement" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BrandingProject" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BrandingScopeItem" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BrandingSupplier" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BudgetIncreaseRequest" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Bug" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CampaignInfluencer" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CommissionRecord" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CommissionRule" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DailyActivityLog" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DeliverableApproval" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DesignSubmission" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DevSprint" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Influencer" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "InfluencerCampaign" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LeadActivity" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MaintenanceLog" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MarketingClient" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OnboardingChecklist" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentPlan" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentPlanItem" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PerformanceReview" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectBudget" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectFile" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectReport" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RequirementDoc" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RetainerContract" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SalesAgent" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SalesCampaign" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SalesTarget" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SavedFilter" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SoftwareProject" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SprintItem" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaxPayment" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaxRate" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Venture" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WeeklyReport" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AttendanceRecord_deletedAt_idx" ON "AttendanceRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "BalanceSheetEntry_deletedAt_idx" ON "BalanceSheetEntry"("deletedAt");

-- CreateIndex
CREATE INDEX "BankStatement_deletedAt_idx" ON "BankStatement"("deletedAt");

-- CreateIndex
CREATE INDEX "Bill_deletedAt_idx" ON "Bill"("deletedAt");

-- CreateIndex
CREATE INDEX "BrandingProject_deletedAt_idx" ON "BrandingProject"("deletedAt");

-- CreateIndex
CREATE INDEX "BrandingScopeItem_deletedAt_idx" ON "BrandingScopeItem"("deletedAt");

-- CreateIndex
CREATE INDEX "BrandingSupplier_deletedAt_idx" ON "BrandingSupplier"("deletedAt");

-- CreateIndex
CREATE INDEX "BudgetIncreaseRequest_deletedAt_idx" ON "BudgetIncreaseRequest"("deletedAt");

-- CreateIndex
CREATE INDEX "Bug_deletedAt_idx" ON "Bug"("deletedAt");

-- CreateIndex
CREATE INDEX "CampaignInfluencer_deletedAt_idx" ON "CampaignInfluencer"("deletedAt");

-- CreateIndex
CREATE INDEX "CashFlowAdjustment_deletedAt_idx" ON "CashFlowAdjustment"("deletedAt");

-- CreateIndex
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");

-- CreateIndex
CREATE INDEX "CommissionRecord_deletedAt_idx" ON "CommissionRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "CommissionRule_deletedAt_idx" ON "CommissionRule"("deletedAt");

-- CreateIndex
CREATE INDEX "ContentItem_deletedAt_idx" ON "ContentItem"("deletedAt");

-- CreateIndex
CREATE INDEX "CreditNote_deletedAt_idx" ON "CreditNote"("deletedAt");

-- CreateIndex
CREATE INDEX "DailyActivityLog_deletedAt_idx" ON "DailyActivityLog"("deletedAt");

-- CreateIndex
CREATE INDEX "Deliverable_deletedAt_idx" ON "Deliverable"("deletedAt");

-- CreateIndex
CREATE INDEX "DeliverableApproval_deletedAt_idx" ON "DeliverableApproval"("deletedAt");

-- CreateIndex
CREATE INDEX "Department_deletedAt_idx" ON "Department"("deletedAt");

-- CreateIndex
CREATE INDEX "DesignSubmission_deletedAt_idx" ON "DesignSubmission"("deletedAt");

-- CreateIndex
CREATE INDEX "DevSprint_deletedAt_idx" ON "DevSprint"("deletedAt");

-- CreateIndex
CREATE INDEX "DirectIncome_deletedAt_idx" ON "DirectIncome"("deletedAt");

-- CreateIndex
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");

-- CreateIndex
CREATE INDEX "Expense_deletedAt_idx" ON "Expense"("deletedAt");

-- CreateIndex
CREATE INDEX "Influencer_deletedAt_idx" ON "Influencer"("deletedAt");

-- CreateIndex
CREATE INDEX "InfluencerCampaign_deletedAt_idx" ON "InfluencerCampaign"("deletedAt");

-- CreateIndex
CREATE INDEX "Invoice_deletedAt_idx" ON "Invoice"("deletedAt");

-- CreateIndex
CREATE INDEX "Lead_deletedAt_idx" ON "Lead"("deletedAt");

-- CreateIndex
CREATE INDEX "LeadActivity_deletedAt_idx" ON "LeadActivity"("deletedAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_deletedAt_idx" ON "LeaveRequest"("deletedAt");

-- CreateIndex
CREATE INDEX "LeaveType_deletedAt_idx" ON "LeaveType"("deletedAt");

-- CreateIndex
CREATE INDEX "MaintenanceLog_deletedAt_idx" ON "MaintenanceLog"("deletedAt");

-- CreateIndex
CREATE INDEX "MarketingClient_deletedAt_idx" ON "MarketingClient"("deletedAt");

-- CreateIndex
CREATE INDEX "Milestone_deletedAt_idx" ON "Milestone"("deletedAt");

-- CreateIndex
CREATE INDEX "Notification_deletedAt_idx" ON "Notification"("deletedAt");

-- CreateIndex
CREATE INDEX "OnboardingChecklist_deletedAt_idx" ON "OnboardingChecklist"("deletedAt");

-- CreateIndex
CREATE INDEX "Payment_deletedAt_idx" ON "Payment"("deletedAt");

-- CreateIndex
CREATE INDEX "PaymentPlan_deletedAt_idx" ON "PaymentPlan"("deletedAt");

-- CreateIndex
CREATE INDEX "PaymentPlanItem_deletedAt_idx" ON "PaymentPlanItem"("deletedAt");

-- CreateIndex
CREATE INDEX "PayrollRun_deletedAt_idx" ON "PayrollRun"("deletedAt");

-- CreateIndex
CREATE INDEX "PerformanceReview_deletedAt_idx" ON "PerformanceReview"("deletedAt");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX "ProjectBudget_deletedAt_idx" ON "ProjectBudget"("deletedAt");

-- CreateIndex
CREATE INDEX "ProjectFile_deletedAt_idx" ON "ProjectFile"("deletedAt");

-- CreateIndex
CREATE INDEX "ProjectMember_deletedAt_idx" ON "ProjectMember"("deletedAt");

-- CreateIndex
CREATE INDEX "ProjectReport_deletedAt_idx" ON "ProjectReport"("deletedAt");

-- CreateIndex
CREATE INDEX "Proposal_deletedAt_idx" ON "Proposal"("deletedAt");

-- CreateIndex
CREATE INDEX "RequirementDoc_deletedAt_idx" ON "RequirementDoc"("deletedAt");

-- CreateIndex
CREATE INDEX "RetainerContract_deletedAt_idx" ON "RetainerContract"("deletedAt");

-- CreateIndex
CREATE INDEX "SalesAgent_deletedAt_idx" ON "SalesAgent"("deletedAt");

-- CreateIndex
CREATE INDEX "SalesCampaign_deletedAt_idx" ON "SalesCampaign"("deletedAt");

-- CreateIndex
CREATE INDEX "SalesTarget_deletedAt_idx" ON "SalesTarget"("deletedAt");

-- CreateIndex
CREATE INDEX "SavedFilter_deletedAt_idx" ON "SavedFilter"("deletedAt");

-- CreateIndex
CREATE INDEX "SoftwareProject_deletedAt_idx" ON "SoftwareProject"("deletedAt");

-- CreateIndex
CREATE INDEX "SprintItem_deletedAt_idx" ON "SprintItem"("deletedAt");

-- CreateIndex
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");

-- CreateIndex
CREATE INDEX "TaskComment_deletedAt_idx" ON "TaskComment"("deletedAt");

-- CreateIndex
CREATE INDEX "TaxPayment_deletedAt_idx" ON "TaxPayment"("deletedAt");

-- CreateIndex
CREATE INDEX "TaxRate_deletedAt_idx" ON "TaxRate"("deletedAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "Venture_deletedAt_idx" ON "Venture"("deletedAt");

-- CreateIndex
CREATE INDEX "VentureExpense_deletedAt_idx" ON "VentureExpense"("deletedAt");

-- CreateIndex
CREATE INDEX "VentureIncome_deletedAt_idx" ON "VentureIncome"("deletedAt");

-- CreateIndex
CREATE INDEX "WeeklyReport_deletedAt_idx" ON "WeeklyReport"("deletedAt");

-- CreateIndex
CREATE INDEX "roles_deletedAt_idx" ON "roles"("deletedAt");

