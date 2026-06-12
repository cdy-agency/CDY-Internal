import {
  EmploymentType,
  EmployeeStatus,
  MemberRole,
  MilestoneStatus,
  PrismaClient,
  ProjectPriority,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { getRoleIdByKey } from './rbac.seed';

export async function seedProjectsData(
  prisma: PrismaClient,
  users: {
    ceo: { id: string };
    financeManager: { id: string };
    salesAgent: { id: string };
  },
  createdBy: string,
): Promise<void> {
  const existing = await prisma.project.count();
  if (existing > 0) return;

  const passwordHash = await bcrypt.hash('CDY@2026!', 10);
  const pmRoleId = await getRoleIdByKey(prisma, 'PROJECT_MANAGER');
  const teamRoleId = await getRoleIdByKey(prisma, 'TEAM_MEMBER');
  const opsRoleId = await getRoleIdByKey(prisma, 'OPERATIONS_MANAGER');

  const opsDept = await prisma.department.findFirst({
    where: { name: 'Operations' },
  });
  const techDept = await prisma.department.findFirst({
    where: { name: 'Technology' },
  });

  const pmUser =
    (await prisma.user.findUnique({ where: { email: 'pm@cdy.com' } })) ??
    (await prisma.user.create({
      data: {
        email: 'pm@cdy.com',
        passwordHash,
        firstName: 'Kofi',
        lastName: 'Asante',
        roleId: pmRoleId,
      },
    }));

  const jamesUser =
    (await prisma.user.findUnique({ where: { email: 'james@cdy.com' } })) ??
    (await prisma.user.create({
      data: {
        email: 'james@cdy.com',
        passwordHash,
        firstName: 'James',
        lastName: 'Osei',
        roleId: teamRoleId,
      },
    }));

  const nadiaUser =
    (await prisma.user.findUnique({ where: { email: 'nadia@cdy.com' } })) ??
    (await prisma.user.create({
      data: {
        email: 'nadia@cdy.com',
        passwordHash,
        firstName: 'Nadia',
        lastName: 'Mensah',
        roleId: teamRoleId,
      },
    }));

  const opsUser =
    (await prisma.user.findUnique({
      where: { email: 'operations@cdy.com' },
    })) ??
    (await prisma.user.create({
      data: {
        email: 'operations@cdy.com',
        passwordHash,
        firstName: 'Grace',
        lastName: 'Uwimana',
        roleId: opsRoleId,
      },
    }));

  async function ensureEmployee(
    userId: string,
    code: string,
    firstName: string,
    lastName: string,
    email: string,
    jobTitle: string,
    departmentId: string | null | undefined,
    baseSalary: number,
  ) {
    const existingEmp = await prisma.employee.findUnique({ where: { userId } });
    if (existingEmp) return existingEmp;

    return prisma.employee.create({
      data: {
        userId,
        employeeCode: code,
        firstName,
        lastName,
        email,
        jobTitle,
        departmentId: departmentId ?? undefined,
        employmentType: EmploymentType.FULL_TIME,
        status: EmployeeStatus.ACTIVE,
        startDate: new Date('2024-03-01'),
        baseSalary,
        currency: 'USD',
        createdBy,
      },
    });
  }

  const pmEmployee = await ensureEmployee(
    pmUser.id,
    'CDY-EMP-004',
    'Kofi',
    'Asante',
    'pm@cdy.com',
    'Project Manager',
    opsDept?.id,
    4500,
  );

  const jamesEmployee = await ensureEmployee(
    jamesUser.id,
    'CDY-EMP-005',
    'James',
    'Osei',
    'james@cdy.com',
    'Full Stack Developer',
    techDept?.id,
    3800,
  );

  const nadiaEmployee = await ensureEmployee(
    nadiaUser.id,
    'CDY-EMP-006',
    'Nadia',
    'Mensah',
    'nadia@cdy.com',
    'Frontend Developer',
    techDept?.id,
    3600,
  );

  await ensureEmployee(
    opsUser.id,
    'CDY-EMP-007',
    'Grace',
    'Uwimana',
    'operations@cdy.com',
    'Operations Manager',
    opsDept?.id,
    5500,
  );

  const techStartClient =
    (await prisma.client.findFirst({
      where: { companyName: { contains: 'TechStart', mode: 'insensitive' } },
    })) ??
    (await prisma.client.create({
      data: {
        companyName: 'TechStart Rwanda',
        contactName: 'James Kabera',
        email: 'james@techstart.rw',
        country: 'RW',
        createdBy: users.salesAgent.id,
        assignedTo: users.salesAgent.id,
      },
    }));

  const kigaliMediaClient =
    (await prisma.client.findFirst({
      where: { companyName: { contains: 'Kigali Media', mode: 'insensitive' } },
    })) ??
    (await prisma.client.create({
      data: {
        companyName: 'Kigali Media Ltd',
        contactName: 'Amina Uwera',
        email: 'amina@kigalimedia.rw',
        country: 'RW',
        createdBy: users.salesAgent.id,
        assignedTo: users.salesAgent.id,
      },
    }));

  const acmeClient =
    (await prisma.client.findFirst({
      where: { companyName: { contains: 'Acme', mode: 'insensitive' } },
    })) ??
    (await prisma.client.create({
      data: {
        companyName: 'Acme Corp Rwanda',
        contactName: 'Sarah Ingabire',
        email: 'sarah@acme.rw',
        country: 'RW',
        createdBy: users.salesAgent.id,
        assignedTo: users.salesAgent.id,
      },
    }));

  const ecoClient = await prisma.client.create({
    data: {
      companyName: 'Eco Ventures',
      contactName: 'Blaise Nkurunziza',
      email: 'blaise@eco.rw',
      country: 'RW',
      createdBy: users.salesAgent.id,
      assignedTo: users.salesAgent.id,
    },
  });

  const now = new Date();
  const aug15 = new Date(now.getFullYear(), 7, 15);
  const jul30 = new Date(now.getFullYear(), 6, 30);
  const jul15 = new Date(now.getFullYear(), 6, 15);
  const jun16 = new Date(now.getFullYear(), now.getMonth(), 16);
  const jun18 = new Date(now.getFullYear(), now.getMonth(), 18);
  const jun25 = new Date(now.getFullYear(), now.getMonth(), 25);

  const sampleProjects = [
    {
      code: 'CDY-PRJ-001',
      name: 'TechStart Rwanda Website',
      clientId: techStartClient.id,
      serviceType: 'software_dev',
      status: ProjectStatus.ACTIVE,
      priority: ProjectPriority.HIGH,
      estimatedBudget: 24000,
      endDate: aug15,
      milestones: [
        {
          name: 'Requirements & Design',
          billingAmount: 4800,
          order: 1,
          status: MilestoneStatus.INVOICED,
        },
        {
          name: 'Frontend Development',
          billingAmount: 9600,
          order: 2,
          status: MilestoneStatus.IN_PROGRESS,
        },
        {
          name: 'Backend & Integration',
          billingAmount: 7200,
          order: 3,
          status: MilestoneStatus.PENDING,
        },
        {
          name: 'Testing & Deployment',
          billingAmount: 2400,
          order: 4,
          status: MilestoneStatus.PENDING,
        },
      ],
    },
    {
      code: 'CDY-PRJ-002',
      name: 'Kigali Media Social Campaign Q3',
      clientId: kigaliMediaClient.id,
      serviceType: 'marketing',
      status: ProjectStatus.ACTIVE,
      priority: ProjectPriority.MEDIUM,
      estimatedBudget: 8400,
      endDate: null,
      milestones: [
        {
          name: 'Content Calendar Jun',
          billingAmount: 2800,
          order: 1,
          status: MilestoneStatus.COMPLETED,
        },
        {
          name: 'Content Calendar Jul',
          billingAmount: 2800,
          order: 2,
          status: MilestoneStatus.PENDING,
        },
        {
          name: 'Content Calendar Aug',
          billingAmount: 2800,
          order: 3,
          status: MilestoneStatus.PENDING,
        },
      ],
    },
    {
      code: 'CDY-PRJ-003',
      name: 'Acme Corp Brand Identity',
      clientId: acmeClient.id,
      serviceType: 'branding',
      status: ProjectStatus.ACTIVE,
      priority: ProjectPriority.HIGH,
      estimatedBudget: 6000,
      endDate: jul30,
      milestones: [
        {
          name: 'Brand Strategy',
          billingAmount: 1500,
          order: 1,
          status: MilestoneStatus.COMPLETED,
        },
        {
          name: 'Logo & Visual Identity',
          billingAmount: 3000,
          order: 2,
          status: MilestoneStatus.IN_PROGRESS,
        },
        {
          name: 'Brand Guidelines',
          billingAmount: 1500,
          order: 3,
          status: MilestoneStatus.PENDING,
        },
      ],
    },
    {
      code: 'CDY-PRJ-004',
      name: 'Eco Ventures Pitch Deck',
      clientId: ecoClient.id,
      serviceType: 'branding',
      status: ProjectStatus.ON_HOLD,
      priority: ProjectPriority.MEDIUM,
      estimatedBudget: 5000,
      endDate: jul15,
      milestones: [],
    },
  ];

  const techStartProjectId = await createProjectWithMilestones(
    prisma,
    sampleProjects[0],
    pmEmployee.id,
    [jamesEmployee.id, nadiaEmployee.id],
    users.ceo.id,
    now,
  );

  await createProjectWithMilestones(
    prisma,
    sampleProjects[1],
    pmEmployee.id,
    [nadiaEmployee.id],
    users.ceo.id,
    now,
  );

  await createProjectWithMilestones(
    prisma,
    sampleProjects[2],
    pmEmployee.id,
    [jamesEmployee.id],
    users.ceo.id,
    now,
  );

  await createProjectWithMilestones(
    prisma,
    sampleProjects[3],
    pmEmployee.id,
    [],
    users.ceo.id,
    now,
  );

  const techStartMilestones = await prisma.milestone.findMany({
    where: { projectId: techStartProjectId },
    orderBy: { order: 'asc' },
  });

  const sampleTasks = [
    {
      title: 'Gather requirements document',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      milestoneIndex: 0,
      assigneeId: pmEmployee.id,
    },
    {
      title: 'Create wireframes in Figma',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      milestoneIndex: 0,
      assigneeId: nadiaEmployee.id,
    },
    {
      title: 'Client approval on wireframes',
      status: TaskStatus.DONE,
      priority: TaskPriority.URGENT,
      milestoneIndex: 0,
      assigneeId: pmEmployee.id,
    },
    {
      title: 'Build homepage',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      milestoneIndex: 1,
      assigneeId: nadiaEmployee.id,
      dueDate: jun18,
      estimatedHours: 8,
    },
    {
      title: 'Build about page',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      milestoneIndex: 1,
      assigneeId: nadiaEmployee.id,
      dueDate: jun25,
      estimatedHours: 6,
    },
    {
      title: 'Build services page',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      milestoneIndex: 1,
      assigneeId: nadiaEmployee.id,
    },
    {
      title: 'Contact form integration',
      status: TaskStatus.BLOCKED,
      priority: TaskPriority.HIGH,
      milestoneIndex: 1,
      assigneeId: jamesEmployee.id,
      dueDate: jun16,
      estimatedHours: 4,
    },
  ];

  for (const taskDef of sampleTasks) {
    const milestone = techStartMilestones[taskDef.milestoneIndex];
    const task = await prisma.task.create({
      data: {
        projectId: techStartProjectId,
        milestoneId: milestone?.id,
        title: taskDef.title,
        assigneeId: taskDef.assigneeId,
        priority: taskDef.priority,
        status: taskDef.status,
        dueDate: taskDef.dueDate,
        estimatedHours: taskDef.estimatedHours,
        createdBy: pmEmployee.userId,
        ...(taskDef.status === TaskStatus.DONE && { completedAt: now }),
      },
    });

    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        changedBy: pmEmployee.userId,
      },
    });

    if (taskDef.status !== TaskStatus.TODO) {
      await prisma.taskStatusHistory.create({
        data: {
          taskId: task.id,
          fromStatus: TaskStatus.TODO,
          toStatus: taskDef.status,
          changedBy: taskDef.assigneeId
            ? (
                await prisma.employee.findUnique({
                  where: { id: taskDef.assigneeId },
                  select: { userId: true },
                })
              )?.userId ?? pmEmployee.userId
            : pmEmployee.userId,
        },
      });
    }
  }

  await prisma.timeEntry.createMany({
    data: [
      {
        projectId: techStartProjectId,
        employeeId: jamesEmployee.id,
        date: new Date(now.getFullYear(), now.getMonth(), 13),
        hours: 6,
        description: 'Create wireframes',
        isBillable: true,
      },
      {
        projectId: techStartProjectId,
        employeeId: nadiaEmployee.id,
        date: new Date(now.getFullYear(), now.getMonth(), 15),
        hours: 4.5,
        description: 'Build homepage',
        isBillable: true,
      },
      {
        projectId: techStartProjectId,
        employeeId: jamesEmployee.id,
        date: new Date(now.getFullYear(), now.getMonth(), 15),
        hours: 3,
        description: 'Build homepage backend support',
        isBillable: true,
      },
      {
        projectId: techStartProjectId,
        employeeId: pmEmployee.id,
        date: new Date(now.getFullYear(), now.getMonth(), 14),
        hours: 1,
        description: 'Client approval wireframes',
        isBillable: false,
      },
    ],
  });
}

async function createProjectWithMilestones(
  prisma: PrismaClient,
  def: {
    code: string;
    name: string;
    clientId: string;
    serviceType: string;
    status: ProjectStatus;
    priority: ProjectPriority;
    estimatedBudget: number;
    endDate: Date | null;
    milestones: Array<{
      name: string;
      billingAmount: number;
      order: number;
      status: MilestoneStatus;
    }>;
  },
  managerId: string,
  memberIds: string[],
  createdBy: string,
  startDate: Date,
): Promise<string> {
  const project = await prisma.project.create({
    data: {
      projectCode: def.code,
      name: def.name,
      clientId: def.clientId,
      serviceType: def.serviceType,
      status: def.status,
      priority: def.priority,
      managerId,
      startDate,
      endDate: def.endDate,
      estimatedBudget: def.estimatedBudget,
      currency: 'USD',
      createdBy,
    },
  });

  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      employeeId: managerId,
      role: MemberRole.MANAGER,
    },
  });

  if (memberIds.length > 0) {
    await prisma.projectMember.createMany({
      data: memberIds.map((employeeId) => ({
        projectId: project.id,
        employeeId,
        role: MemberRole.MEMBER,
      })),
      skipDuplicates: true,
    });
  }

  for (const m of def.milestones) {
    await prisma.milestone.create({
      data: {
        projectId: project.id,
        name: m.name,
        billingAmount: m.billingAmount,
        currency: 'USD',
        status: m.status,
        order: m.order,
        ...(m.status === MilestoneStatus.COMPLETED && {
          approvedAt: startDate,
          approvedBy: createdBy,
        }),
      },
    });
  }

  return project.id;
}
