-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('POST', 'REEL', 'STORY', 'CAROUSEL', 'VIDEO', 'BLOG', 'EMAIL', 'AD');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'READY', 'APPROVED', 'PUBLISHED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SoftwareProjectType" AS ENUM ('WEBSITE', 'WEB_APP', 'MOBILE_APP', 'SYSTEM', 'OTHER');

-- CreateEnum
CREATE TYPE "SoftwarePhase" AS ENUM ('REQUIREMENTS', 'DESIGN', 'DEVELOPMENT', 'QA', 'DEPLOYMENT', 'MAINTENANCE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'REVISED');

-- CreateEnum
CREATE TYPE "DesignStatus" AS ENUM ('IN_PROGRESS', 'SENT', 'APPROVED', 'CHANGES_REQUESTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "QaStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('BUG', 'UPDATE', 'SECURITY');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "BrandingStatus" AS ENUM ('IN_PROGRESS', 'DELIVERED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScopeStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'MISSED');

-- CreateEnum
CREATE TYPE "SalesCampaignStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateTable
CREATE TABLE "MarketingClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "retainerId" TEXT,
    "platforms" TEXT[],
    "postsPerMonth" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "marketingClientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "platform" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectType" "SoftwareProjectType" NOT NULL DEFAULT 'WEBSITE',
    "phase" "SoftwarePhase" NOT NULL DEFAULT 'REQUIREMENTS',
    "startDate" TIMESTAMP(3) NOT NULL,
    "deployedAt" TIMESTAMP(3),
    "maintenanceEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoftwareProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementDoc" (
    "id" TEXT NOT NULL,
    "softwareProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fileUrl" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "sentToClientAt" TIMESTAMP(3),
    "clientSignedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignPhase" (
    "id" TEXT NOT NULL,
    "softwareProjectId" TEXT NOT NULL,
    "figmaUrl" TEXT,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "status" "DesignStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "sentToClientAt" TIMESTAMP(3),
    "clientApprovedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevSprint" (
    "id" TEXT NOT NULL,
    "softwareProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANNED',
    "completedAt" TIMESTAMP(3),
    "milestoneId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevSprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintItem" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'TODO',
    "assigneeId" TEXT,
    "storyPoints" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SprintItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaPhase" (
    "id" TEXT NOT NULL,
    "softwareProjectId" TEXT NOT NULL,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "status" "QaStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QaPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bug" (
    "id" TEXT NOT NULL,
    "qaPhaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "BugSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "softwareProjectId" TEXT NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL,
    "deploymentUrl" TEXT,
    "serverDetails" TEXT,
    "deployedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "softwareProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "BugSeverity" NOT NULL DEFAULT 'MEDIUM',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "assigneeId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandingProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "BrandingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandingProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandingScopeItem" (
    "id" TEXT NOT NULL,
    "brandingProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "supplierId" TEXT,
    "status" "ScopeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandingScopeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignSubmission" (
    "id" TEXT NOT NULL,
    "scopeItemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileUrl" TEXT,
    "description" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "clientFeedback" TEXT,
    "submittedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,

    CONSTRAINT "DesignSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandingSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandingSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Influencer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "otherPlatforms" TEXT[],
    "followersCount" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerCampaign" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "brief" TEXT,
    "platforms" TEXT[],
    "budget" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignInfluencer" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "agreedFee" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(10,2),
    "paymentNotes" TEXT,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignInfluencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "campaignInfluencerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "DeliverableStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "postUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCampaign" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "productService" TEXT NOT NULL,
    "territory" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "SalesCampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "visitTarget" INTEGER,
    "leadTarget" INTEGER,
    "salesTarget" INTEGER,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAgent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "territory" TEXT,
    "visitTarget" INTEGER,
    "leadTarget" INTEGER,
    "salesTarget" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SalesAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivityLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "visitsCount" INTEGER NOT NULL DEFAULT 0,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "salesAmount" DECIMAL(12,2),
    "notes" TEXT,
    "challenges" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "totalVisits" INTEGER NOT NULL,
    "totalLeads" INTEGER NOT NULL,
    "totalSales" INTEGER NOT NULL,
    "totalSalesAmount" DECIMAL(12,2),
    "activeAgents" INTEGER NOT NULL,
    "highlights" TEXT,
    "challenges" TEXT,
    "nextWeekPlan" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingClient_clientId_key" ON "MarketingClient"("clientId");

-- CreateIndex
CREATE INDEX "MarketingClient_clientId_idx" ON "MarketingClient"("clientId");

-- CreateIndex
CREATE INDEX "MarketingClient_isActive_idx" ON "MarketingClient"("isActive");

-- CreateIndex
CREATE INDEX "ContentItem_marketingClientId_idx" ON "ContentItem"("marketingClientId");

-- CreateIndex
CREATE INDEX "ContentItem_scheduledDate_idx" ON "ContentItem"("scheduledDate");

-- CreateIndex
CREATE INDEX "ContentItem_status_idx" ON "ContentItem"("status");

-- CreateIndex
CREATE INDEX "ContentItem_platform_idx" ON "ContentItem"("platform");

-- CreateIndex
CREATE INDEX "ContentItem_marketingClientId_status_idx" ON "ContentItem"("marketingClientId", "status");

-- CreateIndex
CREATE INDEX "ContentItem_marketingClientId_scheduledDate_idx" ON "ContentItem"("marketingClientId", "scheduledDate");

-- CreateIndex
CREATE INDEX "SoftwareProject_clientId_idx" ON "SoftwareProject"("clientId");

-- CreateIndex
CREATE INDEX "SoftwareProject_phase_idx" ON "SoftwareProject"("phase");

-- CreateIndex
CREATE INDEX "SoftwareProject_isActive_idx" ON "SoftwareProject"("isActive");

-- CreateIndex
CREATE INDEX "SoftwareProject_clientId_isActive_idx" ON "SoftwareProject"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "RequirementDoc_softwareProjectId_idx" ON "RequirementDoc"("softwareProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignPhase_softwareProjectId_key" ON "DesignPhase"("softwareProjectId");

-- CreateIndex
CREATE INDEX "DevSprint_softwareProjectId_idx" ON "DevSprint"("softwareProjectId");

-- CreateIndex
CREATE INDEX "DevSprint_status_idx" ON "DevSprint"("status");

-- CreateIndex
CREATE INDEX "SprintItem_sprintId_idx" ON "SprintItem"("sprintId");

-- CreateIndex
CREATE INDEX "SprintItem_status_idx" ON "SprintItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QaPhase_softwareProjectId_key" ON "QaPhase"("softwareProjectId");

-- CreateIndex
CREATE INDEX "Bug_qaPhaseId_idx" ON "Bug"("qaPhaseId");

-- CreateIndex
CREATE INDEX "Bug_status_idx" ON "Bug"("status");

-- CreateIndex
CREATE INDEX "Bug_severity_idx" ON "Bug"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_softwareProjectId_key" ON "Deployment"("softwareProjectId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_softwareProjectId_idx" ON "MaintenanceLog"("softwareProjectId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_status_idx" ON "MaintenanceLog"("status");

-- CreateIndex
CREATE INDEX "BrandingProject_clientId_idx" ON "BrandingProject"("clientId");

-- CreateIndex
CREATE INDEX "BrandingProject_status_idx" ON "BrandingProject"("status");

-- CreateIndex
CREATE INDEX "BrandingScopeItem_brandingProjectId_idx" ON "BrandingScopeItem"("brandingProjectId");

-- CreateIndex
CREATE INDEX "BrandingScopeItem_status_idx" ON "BrandingScopeItem"("status");

-- CreateIndex
CREATE INDEX "BrandingScopeItem_brandingProjectId_status_idx" ON "BrandingScopeItem"("brandingProjectId", "status");

-- CreateIndex
CREATE INDEX "DesignSubmission_scopeItemId_idx" ON "DesignSubmission"("scopeItemId");

-- CreateIndex
CREATE INDEX "Influencer_platform_idx" ON "Influencer"("platform");

-- CreateIndex
CREATE INDEX "Influencer_isActive_idx" ON "Influencer"("isActive");

-- CreateIndex
CREATE INDEX "InfluencerCampaign_clientId_idx" ON "InfluencerCampaign"("clientId");

-- CreateIndex
CREATE INDEX "InfluencerCampaign_status_idx" ON "InfluencerCampaign"("status");

-- CreateIndex
CREATE INDEX "CampaignInfluencer_campaignId_idx" ON "CampaignInfluencer"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignInfluencer_influencerId_idx" ON "CampaignInfluencer"("influencerId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignInfluencer_campaignId_influencerId_key" ON "CampaignInfluencer"("campaignId", "influencerId");

-- CreateIndex
CREATE INDEX "Deliverable_campaignInfluencerId_idx" ON "Deliverable"("campaignInfluencerId");

-- CreateIndex
CREATE INDEX "Deliverable_status_idx" ON "Deliverable"("status");

-- CreateIndex
CREATE INDEX "Deliverable_campaignInfluencerId_status_idx" ON "Deliverable"("campaignInfluencerId", "status");

-- CreateIndex
CREATE INDEX "SalesCampaign_clientId_idx" ON "SalesCampaign"("clientId");

-- CreateIndex
CREATE INDEX "SalesCampaign_status_idx" ON "SalesCampaign"("status");

-- CreateIndex
CREATE INDEX "SalesAgent_campaignId_idx" ON "SalesAgent"("campaignId");

-- CreateIndex
CREATE INDEX "SalesAgent_employeeId_idx" ON "SalesAgent"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesAgent_campaignId_employeeId_key" ON "SalesAgent"("campaignId", "employeeId");

-- CreateIndex
CREATE INDEX "DailyActivityLog_campaignId_idx" ON "DailyActivityLog"("campaignId");

-- CreateIndex
CREATE INDEX "DailyActivityLog_agentId_idx" ON "DailyActivityLog"("agentId");

-- CreateIndex
CREATE INDEX "DailyActivityLog_date_idx" ON "DailyActivityLog"("date");

-- CreateIndex
CREATE INDEX "DailyActivityLog_campaignId_date_idx" ON "DailyActivityLog"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivityLog_agentId_date_key" ON "DailyActivityLog"("agentId", "date");

-- CreateIndex
CREATE INDEX "WeeklyReport_campaignId_idx" ON "WeeklyReport"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_campaignId_weekNumber_key" ON "WeeklyReport"("campaignId", "weekNumber");

-- CreateIndex
CREATE INDEX "CronLog_jobName_idx" ON "CronLog"("jobName");

-- CreateIndex
CREATE INDEX "CronLog_startedAt_idx" ON "CronLog"("startedAt");

-- CreateIndex
CREATE INDEX "CronLog_jobName_startedAt_idx" ON "CronLog"("jobName", "startedAt");

-- AddForeignKey
ALTER TABLE "MarketingClient" ADD CONSTRAINT "MarketingClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_marketingClientId_fkey" FOREIGN KEY ("marketingClientId") REFERENCES "MarketingClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareProject" ADD CONSTRAINT "SoftwareProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDoc" ADD CONSTRAINT "RequirementDoc_softwareProjectId_fkey" FOREIGN KEY ("softwareProjectId") REFERENCES "SoftwareProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPhase" ADD CONSTRAINT "DesignPhase_softwareProjectId_fkey" FOREIGN KEY ("softwareProjectId") REFERENCES "SoftwareProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevSprint" ADD CONSTRAINT "DevSprint_softwareProjectId_fkey" FOREIGN KEY ("softwareProjectId") REFERENCES "SoftwareProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintItem" ADD CONSTRAINT "SprintItem_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "DevSprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaPhase" ADD CONSTRAINT "QaPhase_softwareProjectId_fkey" FOREIGN KEY ("softwareProjectId") REFERENCES "SoftwareProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_qaPhaseId_fkey" FOREIGN KEY ("qaPhaseId") REFERENCES "QaPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_softwareProjectId_fkey" FOREIGN KEY ("softwareProjectId") REFERENCES "SoftwareProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_softwareProjectId_fkey" FOREIGN KEY ("softwareProjectId") REFERENCES "SoftwareProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandingProject" ADD CONSTRAINT "BrandingProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandingScopeItem" ADD CONSTRAINT "BrandingScopeItem_brandingProjectId_fkey" FOREIGN KEY ("brandingProjectId") REFERENCES "BrandingProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandingScopeItem" ADD CONSTRAINT "BrandingScopeItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "BrandingSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignSubmission" ADD CONSTRAINT "DesignSubmission_scopeItemId_fkey" FOREIGN KEY ("scopeItemId") REFERENCES "BrandingScopeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerCampaign" ADD CONSTRAINT "InfluencerCampaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignInfluencer" ADD CONSTRAINT "CampaignInfluencer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "InfluencerCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignInfluencer" ADD CONSTRAINT "CampaignInfluencer_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_campaignInfluencerId_fkey" FOREIGN KEY ("campaignInfluencerId") REFERENCES "CampaignInfluencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCampaign" ADD CONSTRAINT "SalesCampaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAgent" ADD CONSTRAINT "SalesAgent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SalesCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivityLog" ADD CONSTRAINT "DailyActivityLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SalesCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivityLog" ADD CONSTRAINT "DailyActivityLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "SalesAgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SalesCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
