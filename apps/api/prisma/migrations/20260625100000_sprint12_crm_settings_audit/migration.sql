-- CreateTable
CREATE TABLE "CrmSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAuditLog" (
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

    CONSTRAINT "CrmAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "module" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmSetting_key_key" ON "CrmSetting"("key");

-- CreateIndex
CREATE INDEX "CrmAuditLog_userId_idx" ON "CrmAuditLog"("userId");

-- CreateIndex
CREATE INDEX "CrmAuditLog_entityType_entityId_idx" ON "CrmAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "CrmAuditLog_createdAt_idx" ON "CrmAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SavedFilter_userId_module_idx" ON "SavedFilter"("userId", "module");
