-- CreateTable
CREATE TABLE "SalesTarget" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "revenueTarget" DECIMAL(12,2) NOT NULL,
    "dealsTarget" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "setBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "followUpReminders" BOOLEAN NOT NULL DEFAULT true,
    "proposalExpiryAlerts" BOOLEAN NOT NULL DEFAULT true,
    "dealClosedAlerts" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesTarget_agentId_idx" ON "SalesTarget"("agentId");

-- CreateIndex
CREATE INDEX "SalesTarget_month_idx" ON "SalesTarget"("month");

-- CreateIndex
CREATE UNIQUE INDEX "SalesTarget_agentId_month_key" ON "SalesTarget"("agentId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "CrmNotificationPreference_userId_key" ON "CrmNotificationPreference"("userId");
