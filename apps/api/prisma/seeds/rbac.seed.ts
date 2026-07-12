import { PrismaClient } from '@prisma/client';

export const SYSTEM_FEATURES = [
  { key: 'finance.dashboard', name: 'Finance Dashboard', module: 'finance', description: 'Overview metrics and summary cards' },
  { key: 'finance.invoices', name: 'Invoices', module: 'finance', description: 'Create, send, and manage invoices' },
  { key: 'finance.payments', name: 'Payments', module: 'finance', description: 'Record and view payments' },
  { key: 'finance.expenses', name: 'Expenses', module: 'finance', description: 'Log and manage business expenses' },
  { key: 'finance.bills', name: 'Bills & Payables', module: 'finance', description: 'Track supplier bills' },
  { key: 'finance.ar', name: 'AR Ledger', module: 'finance', description: 'Accounts receivable ledger' },
  { key: 'finance.credit_notes', name: 'Credit Notes', module: 'finance', description: 'Issue credit notes against invoices' },
  { key: 'finance.payment_plans', name: 'Payment Plans', module: 'finance', description: 'Instalment payment schedules' },
  { key: 'finance.reconciliation', name: 'Bank Reconciliation', module: 'finance', description: 'Reconcile bank statements' },
  { key: 'finance.tax', name: 'Tax Management', module: 'finance', description: 'Tax rates and liability reports' },
  { key: 'finance.retainers', name: 'Retainer Contracts', module: 'finance', description: 'Monthly retainer billing' },
  { key: 'finance.commissions', name: 'Commissions', module: 'finance', description: 'Commission rules and records' },
  { key: 'finance.commissions.own', name: 'Own Commissions', module: 'finance', description: 'View own commission records only' },
  { key: 'finance.payroll', name: 'Payroll', module: 'finance', description: 'Monthly payroll runs and payslips' },
  { key: 'finance.budget', name: 'Project Budget', module: 'finance', description: 'Project budget tracking' },
  { key: 'finance.reports', name: 'Financial Reports', module: 'finance', description: 'P&L, ageing, cash flow, balance sheet' },
  { key: 'finance.audit', name: 'Finance Audit Log', module: 'finance', description: 'Tamper-proof finance action trail' },
  { key: 'finance.settings', name: 'Finance Settings', module: 'finance', description: 'Company details, invoice config' },
  { key: 'finance.reserve', name: 'Reserve Fund', module: 'finance', description: 'View and manage the company reserve fund' },
  { key: 'ventures.view', name: 'Ventures — View', module: 'finance', description: 'View venture income and expenses' },
  { key: 'ventures.manage', name: 'Ventures — Manage', module: 'finance', description: 'Create and manage ventures, log income and expenses' },
  { key: 'crm.leads', name: 'Leads', module: 'crm', description: 'Lead capture, management, and pipeline movement' },
  { key: 'crm.all', name: 'CRM — View All Records', module: 'crm', description: 'View all agents\u2019 leads, pipeline, and proposals (not just own)' },
  { key: 'crm.pipeline', name: 'Sales Pipeline', module: 'crm', description: 'Kanban pipeline board and stage management' },
  { key: 'crm.clients', name: 'Clients', module: 'crm', description: 'Converted client account management' },
  { key: 'crm.proposals', name: 'Proposals', module: 'crm', description: 'Proposal tracking (PDF prepared externally)' },
  { key: 'crm.reports', name: 'CRM Reports', module: 'crm', description: 'Sales performance and conversion reports' },
  { key: 'hr.employees', name: 'Employees', module: 'hr', description: 'Employee profiles and directory' },
  { key: 'hr.employees.sensitive', name: 'Employees — Sensitive Data', module: 'hr', description: 'View sensitive employee data (salary, bank, personal details)' },
  { key: 'hr.attendance', name: 'Attendance & Leave', module: 'hr', description: 'Leave requests and attendance' },
  { key: 'hr.payroll', name: 'HR Payroll View', module: 'hr', description: 'HR view of payroll data' },
  { key: 'hr.performance', name: 'Performance Reviews', module: 'hr', description: 'Performance review tracking' },
  { key: 'hr.settings', name: 'HR Settings', module: 'hr', description: 'HR configuration (working days, leave year)' },
  { key: 'projects.all', name: 'All Projects', module: 'projects', description: 'View and manage all projects' },
  { key: 'projects.own', name: 'Own Projects', module: 'projects', description: 'View own assigned projects only' },
  { key: 'projects.tasks', name: 'Tasks', module: 'projects', description: 'Task creation, assignment, and management' },
  { key: 'projects.approvals', name: 'Approvals', module: 'projects', description: 'Milestone and deliverable approval workflows' },
  { key: 'projects.reports', name: 'Project Reports', module: 'projects', description: 'Project profitability and progress reports' },
  { key: 'it.users', name: 'User Management', module: 'it', description: 'Create and manage system users' },
  { key: 'it.roles', name: 'Role Management', module: 'it', description: 'Create and manage roles' },
  { key: 'it.permissions', name: 'Permission Management', module: 'it', description: 'Assign permissions to roles' },
  { key: 'it.audit', name: 'IT Audit Log', module: 'it', description: 'IT change audit trail' },
  { key: 'marketing.clients', name: 'Marketing Clients', module: 'marketing', description: 'Manage marketing service clients' },
  { key: 'marketing.content', name: 'Content Calendar', module: 'marketing', description: 'Plan and track content items' },
  { key: 'marketing.reports', name: 'Marketing Reports', module: 'marketing', description: 'Monthly content performance summary' },
  { key: 'software.projects', name: 'Software Projects', module: 'software', description: 'Manage software and web dev projects' },
  { key: 'software.delivery', name: 'Software Delivery', module: 'software', description: 'Sprints, QA, deployment, maintenance' },
  { key: 'branding.projects', name: 'Branding Projects', module: 'branding', description: 'Manage branding projects and scope' },
  { key: 'branding.delivery', name: 'Branding Delivery', module: 'branding', description: 'Submit designs, manage approvals, mark delivered' },
  { key: 'influencer.campaigns', name: 'Influencer Campaigns', module: 'influencer', description: 'Manage influencer campaigns' },
  { key: 'influencer.database', name: 'Influencer Database', module: 'influencer', description: 'Manage the influencer database' },
  { key: 'sales.campaigns', name: 'Sales Campaigns', module: 'sales', description: 'Manage field sales campaigns' },
  { key: 'sales.reporting', name: 'Sales Reporting', module: 'sales', description: 'Log daily activity and view reports' },
  { key: 'ceo.dashboard', name: 'CEO Dashboard', module: 'ceo', description: 'Executive global dashboard' },
] as const;

type PermissionSeed = { key: string; canRead: boolean; canWrite: boolean };

export const DEFAULT_ROLES: Array<{
  key: string;
  name: string;
  homeModule: string;
  description: string;
  isDefault: boolean;
  isSystem: boolean;
  permissions: PermissionSeed[];
}> = [
  {
    key: 'CEO',
    name: 'Chief Executive Officer',
    homeModule: '/ceo',
    description:
      'Full access across all modules — granted via seeded feature permissions (no code bypass)',
    isDefault: true,
    isSystem: true,
    permissions: SYSTEM_FEATURES.map((f) => ({ key: f.key, canRead: true, canWrite: true })),
  },
  {
    key: 'FINANCE_MANAGER',
    name: 'Finance Manager',
    homeModule: '/finance',
    description: 'Full finance module access with separation of duties controls',
    isDefault: true,
    isSystem: false,
    permissions: [
      { key: 'finance.dashboard', canRead: true, canWrite: true },
      { key: 'finance.invoices', canRead: true, canWrite: true },
      { key: 'finance.payments', canRead: true, canWrite: true },
      { key: 'finance.expenses', canRead: true, canWrite: true },
      { key: 'finance.bills', canRead: true, canWrite: true },
      { key: 'finance.ar', canRead: true, canWrite: false },
      { key: 'finance.credit_notes', canRead: true, canWrite: true },
      { key: 'finance.payment_plans', canRead: true, canWrite: true },
      { key: 'finance.reconciliation', canRead: true, canWrite: true },
      { key: 'finance.tax', canRead: true, canWrite: true },
      { key: 'finance.retainers', canRead: true, canWrite: true },
      { key: 'finance.commissions', canRead: true, canWrite: true },
      { key: 'finance.payroll', canRead: true, canWrite: true },
      { key: 'finance.budget', canRead: true, canWrite: true },
      { key: 'finance.reports', canRead: true, canWrite: false },
      { key: 'finance.audit', canRead: true, canWrite: false },
      { key: 'finance.settings', canRead: true, canWrite: false },
      { key: 'finance.reserve', canRead: true, canWrite: true },
      { key: 'ventures.view', canRead: true, canWrite: false },
      { key: 'ventures.manage', canRead: true, canWrite: true },
      { key: 'crm.clients', canRead: true, canWrite: false },
      { key: 'hr.employees', canRead: true, canWrite: false },
      { key: 'hr.employees.sensitive', canRead: true, canWrite: false },
      { key: 'hr.payroll', canRead: true, canWrite: true },
      { key: 'projects.all', canRead: true, canWrite: false },
      { key: 'projects.approvals', canRead: true, canWrite: false },
      { key: 'marketing.clients', canRead: true, canWrite: false },
      { key: 'software.projects', canRead: true, canWrite: false },
      { key: 'branding.projects', canRead: true, canWrite: false },
      { key: 'influencer.campaigns', canRead: true, canWrite: false },
      { key: 'sales.campaigns', canRead: true, canWrite: false },
    ],
  },
  {
    key: 'SALES_AGENT',
    name: 'Sales Agent',
    homeModule: '/crm',
    description: 'Own commission records and CRM access',
    isDefault: true,
    isSystem: false,
    permissions: [
      { key: 'finance.commissions.own', canRead: true, canWrite: false },
      { key: 'crm.leads', canRead: true, canWrite: true },
      { key: 'crm.pipeline', canRead: true, canWrite: true },
      { key: 'crm.clients', canRead: true, canWrite: false },
      { key: 'crm.proposals', canRead: true, canWrite: true },
      { key: 'ventures.view', canRead: true, canWrite: false },
      { key: 'hr.attendance', canRead: true, canWrite: true },
      { key: 'projects.own', canRead: true, canWrite: false },
    ],
  },
  {
    key: 'PROJECT_MANAGER',
    name: 'Project Manager',
    homeModule: '/projects',
    description: 'Own projects and linked finance data',
    isDefault: true,
    isSystem: false,
    permissions: [
      { key: 'finance.invoices', canRead: true, canWrite: false },
      { key: 'finance.expenses', canRead: true, canWrite: false },
      { key: 'finance.budget', canRead: true, canWrite: true },
      { key: 'projects.all', canRead: true, canWrite: true },
      { key: 'projects.tasks', canRead: true, canWrite: true },
      { key: 'projects.approvals', canRead: true, canWrite: true },
      { key: 'ventures.view', canRead: true, canWrite: false },
      { key: 'projects.reports', canRead: true, canWrite: false },
      { key: 'hr.employees', canRead: true, canWrite: false },
      { key: 'software.projects', canRead: true, canWrite: true },
      { key: 'software.delivery', canRead: true, canWrite: true },
      { key: 'branding.projects', canRead: true, canWrite: true },
      { key: 'branding.delivery', canRead: true, canWrite: true },
      { key: 'influencer.campaigns', canRead: true, canWrite: true },
      { key: 'influencer.database', canRead: true, canWrite: true },
      { key: 'sales.campaigns', canRead: true, canWrite: true },
      { key: 'sales.reporting', canRead: true, canWrite: true },
    ],
  },
  {
    key: 'OPERATIONS_MANAGER',
    name: 'Operations Manager',
    homeModule: '/projects',
    description: 'Operational oversight across projects and budget approvals',
    isDefault: true,
    isSystem: false,
    permissions: [
      { key: 'finance.budget', canRead: true, canWrite: true },
      { key: 'finance.expenses', canRead: true, canWrite: false },
      { key: 'ventures.view', canRead: true, canWrite: false },
      { key: 'projects.all', canRead: true, canWrite: true },
      { key: 'projects.tasks', canRead: true, canWrite: true },
      { key: 'projects.approvals', canRead: true, canWrite: true },
      { key: 'projects.reports', canRead: true, canWrite: true },
      { key: 'hr.employees', canRead: true, canWrite: true },
      { key: 'hr.employees.sensitive', canRead: true, canWrite: false },
      { key: 'hr.attendance', canRead: true, canWrite: true },
      { key: 'hr.payroll', canRead: true, canWrite: true },
      { key: 'hr.performance', canRead: true, canWrite: true },
      { key: 'hr.settings', canRead: true, canWrite: true },
      { key: 'crm.leads', canRead: true, canWrite: false },
      { key: 'crm.all', canRead: true, canWrite: false },
      { key: 'crm.pipeline', canRead: true, canWrite: false },
      { key: 'crm.clients', canRead: true, canWrite: true },
      { key: 'crm.reports', canRead: true, canWrite: false },
      { key: 'marketing.clients', canRead: true, canWrite: true },
      { key: 'marketing.content', canRead: true, canWrite: true },
      { key: 'marketing.reports', canRead: true, canWrite: true },
      { key: 'software.projects', canRead: true, canWrite: true },
      { key: 'software.delivery', canRead: true, canWrite: true },
      { key: 'branding.projects', canRead: true, canWrite: true },
      { key: 'branding.delivery', canRead: true, canWrite: true },
      { key: 'influencer.campaigns', canRead: true, canWrite: true },
      { key: 'influencer.database', canRead: true, canWrite: true },
      { key: 'sales.campaigns', canRead: true, canWrite: true },
      { key: 'sales.reporting', canRead: true, canWrite: true },
    ],
  },
  {
    key: 'TEAM_MEMBER',
    name: 'Team Member',
    homeModule: '/hr/leave/my',
    description: 'Own project tasks only — no finance access',
    isDefault: true,
    isSystem: false,
    permissions: [
      { key: 'projects.own', canRead: true, canWrite: false },
      { key: 'projects.tasks', canRead: true, canWrite: true },
      { key: 'ventures.view', canRead: true, canWrite: false },
      { key: 'hr.attendance', canRead: true, canWrite: true },
      { key: 'marketing.content', canRead: true, canWrite: true },
      { key: 'software.delivery', canRead: true, canWrite: true },
      { key: 'branding.projects', canRead: true, canWrite: false },
      { key: 'branding.delivery', canRead: true, canWrite: true },
      { key: 'influencer.campaigns', canRead: true, canWrite: true },
      { key: 'sales.campaigns', canRead: true, canWrite: false },
      { key: 'sales.reporting', canRead: true, canWrite: true },
    ],
  },
  {
    key: 'CLIENT',
    name: 'Client',
    homeModule: '/finance/ventures',
    description: 'Venture visibility only until a scoped client portal exists',
    isDefault: true,
    isSystem: false,
    permissions: [
      // NOTE: finance.invoices intentionally NOT granted. The invoices API is
      // not scoped per-client, so granting a CLIENT read access would expose
      // every company invoice (IDOR). A dedicated, scoped client portal must
      // back any future client-facing invoice access.
      { key: 'ventures.view', canRead: true, canWrite: false },
    ],
  },
  {
    key: 'IT_ADMINISTRATOR',
    name: 'IT Administrator',
    homeModule: '/it',
    description: 'User management, role management, and permission assignment only',
    isDefault: true,
    isSystem: true,
    permissions: [
      { key: 'it.users', canRead: true, canWrite: true },
      { key: 'it.roles', canRead: true, canWrite: true },
      { key: 'it.permissions', canRead: true, canWrite: true },
      { key: 'it.audit', canRead: true, canWrite: true },
    ],
  },
];

const MIGRATION_ROLE_IDS: Record<string, string> = {
  CEO: 'rbac_role_ceo',
  FINANCE_MANAGER: 'rbac_role_finance_manager',
  SALES_AGENT: 'rbac_role_sales_agent',
  PROJECT_MANAGER: 'rbac_role_project_manager',
  OPERATIONS_MANAGER: 'rbac_role_operations_manager',
  TEAM_MEMBER: 'rbac_role_team_member',
  CLIENT: 'rbac_role_client',
  IT_ADMINISTRATOR: 'rbac_role_it',
};

export async function seedRbac(prisma: PrismaClient): Promise<void> {
  // Migrate old IT key to IT_ADMINISTRATOR if still present
  await prisma.role.updateMany({
    where: { key: 'IT' },
    data: { key: 'IT_ADMINISTRATOR' },
  });

  // Security migration: revoke the CLIENT role's finance.invoices permission
  // in existing databases. The invoices API is not scoped per client, so this
  // grant exposed every company invoice to any CLIENT login (IDOR).
  await prisma.rolePermission.deleteMany({
    where: {
      role: { key: 'CLIENT' },
      feature: { key: 'finance.invoices' },
    },
  });

  for (const feature of SYSTEM_FEATURES) {
    await prisma.systemFeature.upsert({
      where: { key: feature.key },
      create: feature,
      update: {
        name: feature.name,
        module: feature.module,
        description: feature.description,
      },
    });
  }

  const featureMap = new Map(
    (await prisma.systemFeature.findMany()).map((f) => [f.key, f.id]),
  );

  for (const roleDef of DEFAULT_ROLES) {
    const roleId = MIGRATION_ROLE_IDS[roleDef.key];
    const role = await prisma.role.upsert({
      where: { key: roleDef.key },
      create: {
        id: roleId,
        key: roleDef.key,
        name: roleDef.name,
        homeModule: roleDef.homeModule,
        description: roleDef.description,
        isDefault: roleDef.isDefault,
        isSystem: roleDef.isSystem,
      },
      update: {
        name: roleDef.name,
        homeModule: roleDef.homeModule,
        description: roleDef.description,
        isDefault: roleDef.isDefault,
        isSystem: roleDef.isSystem,
      },
    });

    for (const perm of roleDef.permissions) {
      const featureId = featureMap.get(perm.key);
      if (!featureId) continue;

      // createIfNotExists — never overwrite IT-admin changes
      const exists = await prisma.rolePermission.findUnique({
        where: { roleId_featureId: { roleId: role.id, featureId } },
        select: { roleId: true },
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            featureId,
            canRead: perm.canRead,
            canWrite: perm.canWrite,
          },
        });
      }
    }
  }
}

export async function getRoleIdByKey(
  prisma: PrismaClient,
  key: string,
): Promise<string> {
  const role = await prisma.role.findUnique({ where: { key } });
  if (!role) {
    throw new Error(`Role not found: ${key}`);
  }
  return role.id;
}
