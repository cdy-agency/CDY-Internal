-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('PROJECT_CREATED', 'PROJECT_STATUS_CHANGED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'MILESTONE_CREATED', 'MILESTONE_COMPLETED', 'MILESTONE_APPROVED', 'TASK_CREATED', 'TASK_STATUS_CHANGED', 'TASK_ASSIGNED', 'TASK_COMMENTED', 'TIME_LOGGED', 'FILE_UPLOADED', 'APPROVAL_REQUESTED', 'APPROVAL_GIVEN', 'APPROVAL_REJECTED');

-- CreateTable
CREATE TABLE "DeliverableApproval" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNote" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverableApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityEventType" NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyRate" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "ratePerHour" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourlyRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliverableApproval_taskId_idx" ON "DeliverableApproval"("taskId");

-- CreateIndex
CREATE INDEX "DeliverableApproval_projectId_idx" ON "DeliverableApproval"("projectId");

-- CreateIndex
CREATE INDEX "DeliverableApproval_status_idx" ON "DeliverableApproval"("status");

-- CreateIndex
CREATE INDEX "ProjectActivity_projectId_idx" ON "ProjectActivity"("projectId");

-- CreateIndex
CREATE INDEX "ProjectActivity_createdAt_idx" ON "ProjectActivity"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyRate_employeeId_key" ON "HourlyRate"("employeeId");

-- CreateIndex
CREATE INDEX "HourlyRate_employeeId_idx" ON "HourlyRate"("employeeId");

-- AddForeignKey
ALTER TABLE "DeliverableApproval" ADD CONSTRAINT "DeliverableApproval_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
