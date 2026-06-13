-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SELF_ASSESSMENT', 'MANAGER_REVIEW', 'ACKNOWLEDGED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "goalsSet" JSONB,
    "selfAssessment" TEXT,
    "selfRating" INTEGER,
    "managerNotes" TEXT,
    "overallRating" INTEGER,
    "strengths" TEXT,
    "improvements" TEXT,
    "nextPeriodGoals" JSONB,
    "acknowledgedAt" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryHistory" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "previousSalary" DECIMAL(12,2) NOT NULL,
    "newSalary" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingChecklist" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL,

    CONSTRAINT "OnboardingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");

-- CreateIndex
CREATE INDEX "PerformanceReview_period_idx" ON "PerformanceReview"("period");

-- CreateIndex
CREATE INDEX "PerformanceReview_status_idx" ON "PerformanceReview"("status");

-- CreateIndex
CREATE INDEX "PerformanceReview_reviewerId_idx" ON "PerformanceReview"("reviewerId");

-- CreateIndex
CREATE INDEX "SalaryHistory_employeeId_idx" ON "SalaryHistory"("employeeId");

-- CreateIndex
CREATE INDEX "SalaryHistory_effectiveFrom_idx" ON "SalaryHistory"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingChecklist_employeeId_key" ON "OnboardingChecklist"("employeeId");

-- CreateIndex
CREATE INDEX "OnboardingItem_checklistId_idx" ON "OnboardingItem"("checklistId");

-- CreateIndex
CREATE INDEX "HrAuditLog_userId_idx" ON "HrAuditLog"("userId");

-- CreateIndex
CREATE INDEX "HrAuditLog_entityType_entityId_idx" ON "HrAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "HrAuditLog_createdAt_idx" ON "HrAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryHistory" ADD CONSTRAINT "SalaryHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingChecklist" ADD CONSTRAINT "OnboardingChecklist_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingItem" ADD CONSTRAINT "OnboardingItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "OnboardingChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
