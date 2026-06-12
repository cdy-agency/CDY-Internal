import { EmploymentType, EmployeeStatus, PrismaClient } from '@prisma/client';

export async function seedHrData(
  prisma: PrismaClient,
  users: {
    ceo: { id: string; email: string; firstName: string; lastName: string };
    financeManager: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    salesAgent: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  },
  createdBy: string,
): Promise<void> {
  const leaveTypes = [
    {
      name: 'Annual Leave',
      code: 'AL',
      defaultDaysPerYear: 21,
      isPaid: true,
      requiresApproval: true,
      requiresDocument: false,
    },
    {
      name: 'Sick Leave',
      code: 'SL',
      defaultDaysPerYear: 10,
      isPaid: true,
      requiresApproval: false,
      requiresDocument: false,
    },
    {
      name: 'Unpaid Leave',
      code: 'UL',
      defaultDaysPerYear: 0,
      isPaid: false,
      requiresApproval: true,
      requiresDocument: false,
    },
    {
      name: 'Public Holiday',
      code: 'PH',
      defaultDaysPerYear: 0,
      isPaid: true,
      requiresApproval: false,
      requiresDocument: false,
    },
    {
      name: 'Maternity Leave',
      code: 'ML',
      defaultDaysPerYear: 84,
      isPaid: true,
      requiresApproval: true,
      requiresDocument: true,
    },
    {
      name: 'Paternity Leave',
      code: 'PL',
      defaultDaysPerYear: 5,
      isPaid: true,
      requiresApproval: true,
      requiresDocument: false,
    },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      create: lt,
      update: lt,
    });
  }

  const departments = [
    { name: 'Finance', description: 'Finance and accounting team' },
    { name: 'Sales', description: 'Sales and business development' },
    { name: 'Technology', description: 'Software development and IT' },
    { name: 'Marketing', description: 'Marketing and content creation' },
    { name: 'Operations', description: 'Operations and project management' },
    { name: 'Creative', description: 'Design, branding, and creative services' },
  ];

  const deptMap = new Map<string, string>();
  for (const dept of departments) {
    const created = await prisma.department.upsert({
      where: { name: dept.name },
      create: dept,
      update: { description: dept.description },
    });
    deptMap.set(dept.name, created.id);
  }

  const hrSettings = [
    { key: 'working_days', value: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']) },
    { key: 'working_hours_per_day', value: '8' },
    { key: 'leave_year_start', value: '01-01' },
    { key: 'carry_over_max_days', value: '5' },
    { key: 'probation_days', value: '90' },
  ];

  for (const setting of hrSettings) {
    await prisma.hrSetting.upsert({
      where: { key: setting.key },
      create: { ...setting, updatedBy: 'system' },
      update: {},
    });
  }

  const employeeSeeds = [
    {
      userId: users.ceo.id,
      employeeCode: 'CDY-EMP-001',
      firstName: users.ceo.firstName,
      lastName: users.ceo.lastName,
      email: users.ceo.email,
      jobTitle: 'Chief Executive Officer',
      departmentName: 'Operations',
      baseSalary: 8500,
    },
    {
      userId: users.financeManager.id,
      employeeCode: 'CDY-EMP-002',
      firstName: users.financeManager.firstName,
      lastName: users.financeManager.lastName,
      email: users.financeManager.email,
      jobTitle: 'Finance Manager',
      departmentName: 'Finance',
      baseSalary: 5200,
    },
    {
      userId: users.salesAgent.id,
      employeeCode: 'CDY-EMP-003',
      firstName: users.salesAgent.firstName,
      lastName: users.salesAgent.lastName,
      email: users.salesAgent.email,
      jobTitle: 'Sales Agent',
      departmentName: 'Sales',
      baseSalary: 3200,
    },
  ];

  const currentYear = new Date().getFullYear();
  const activeLeaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });

  for (const emp of employeeSeeds) {
    const existing = await prisma.employee.findUnique({
      where: { userId: emp.userId },
    });
    if (existing) continue;

    const employee = await prisma.employee.create({
      data: {
        userId: emp.userId,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        jobTitle: emp.jobTitle,
        departmentId: deptMap.get(emp.departmentName),
        employmentType: EmploymentType.FULL_TIME,
        status: EmployeeStatus.ACTIVE,
        startDate: new Date('2024-01-05'),
        baseSalary: emp.baseSalary,
        currency: 'USD',
        createdBy,
      },
    });

    await prisma.leaveBalance.createMany({
      data: activeLeaveTypes.map((lt) => ({
        employeeId: employee.id,
        leaveTypeId: lt.id,
        year: currentYear,
        entitled: lt.defaultDaysPerYear,
        used: 0,
        pending: 0,
        remaining: lt.defaultDaysPerYear,
        carryOver: 0,
      })),
      skipDuplicates: true,
    });
  }
}
