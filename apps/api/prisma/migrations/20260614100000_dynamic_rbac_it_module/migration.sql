-- CreateTable
CREATE TABLE "system_features" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT false,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_audit_logs" (
    "id" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedByEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "it_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_features_key_key" ON "system_features"("key");
CREATE INDEX "system_features_module_idx" ON "system_features"("module");
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");
CREATE INDEX "role_permissions_featureId_idx" ON "role_permissions"("featureId");
CREATE UNIQUE INDEX "role_permissions_roleId_featureId_key" ON "role_permissions"("roleId", "featureId");
CREATE INDEX "it_audit_logs_performedBy_idx" ON "it_audit_logs"("performedBy");
CREATE INDEX "it_audit_logs_action_idx" ON "it_audit_logs"("action");
CREATE INDEX "it_audit_logs_createdAt_idx" ON "it_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "system_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default roles (permissions filled by rbac.seed.ts)
INSERT INTO "roles" ("id", "key", "name", "description", "isDefault", "isSystem", "createdAt", "updatedAt") VALUES
('rbac_role_ceo', 'CEO', 'Chief Executive Officer', 'Executive read access across all modules', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rbac_role_finance_manager', 'FINANCE_MANAGER', 'Finance Manager', 'Full finance module access with separation of duties controls', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rbac_role_sales_agent', 'SALES_AGENT', 'Sales Agent', 'Own commission records and CRM access', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rbac_role_project_manager', 'PROJECT_MANAGER', 'Project Manager', 'Own projects and linked finance data', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rbac_role_operations_manager', 'OPERATIONS_MANAGER', 'Operations Manager', 'Operational oversight across projects and budget approvals', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rbac_role_team_member', 'TEAM_MEMBER', 'Team Member', 'Own project tasks only — no finance access', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rbac_role_client', 'CLIENT', 'Client', 'Own invoices and project portal only', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rbac_role_it', 'IT', 'IT Administrator', 'User management, role management, and permission assignment only', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Migrate User.role enum to roleId FK
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

UPDATE "User" u
SET "roleId" = r.id
FROM "roles" r
WHERE r.key = u.role::text;

UPDATE "User"
SET "roleId" = 'rbac_role_team_member'
WHERE "roleId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

DROP INDEX IF EXISTS "User_role_idx";

ALTER TABLE "User" DROP COLUMN "role";

DROP TYPE "Role";

CREATE INDEX "User_roleId_idx" ON "User"("roleId");

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
