import { Injectable, NotFoundException } from '@nestjs/common';
import { OnboardingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface DefaultOnboardingItem {
  title: string;
  category: string;
  order: number;
  dueDate: string;
}

@Injectable()
export class OnboardingService {
  private readonly DEFAULT_ITEMS: DefaultOnboardingItem[] = [
    { title: 'Complete personal information', category: 'Documentation', order: 1, dueDate: '+1 day' },
    { title: 'Submit bank account details', category: 'Documentation', order: 2, dueDate: '+3 days' },
    { title: 'Sign employment contract', category: 'Documentation', order: 3, dueDate: '+1 day' },
    { title: 'Receive company laptop', category: 'IT Setup', order: 4, dueDate: '+1 day' },
    { title: 'Set up company email', category: 'IT Setup', order: 5, dueDate: '+1 day' },
    { title: 'Get system access (CDY In-House System)', category: 'IT Setup', order: 6, dueDate: '+1 day' },
    { title: 'Meet direct manager', category: 'Team Introduction', order: 7, dueDate: '+1 day' },
    { title: 'Meet the full team', category: 'Team Introduction', order: 8, dueDate: '+3 days' },
    { title: 'Office tour and facilities overview', category: 'Team Introduction', order: 9, dueDate: '+1 day' },
    { title: 'Complete HR policy review', category: 'Training', order: 10, dueDate: '+7 days' },
    { title: 'Complete role-specific training', category: 'Training', order: 11, dueDate: '+14 days' },
    { title: '30-day check-in with manager', category: 'Training', order: 12, dueDate: '+30 days' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async initialise(employeeId: string, startDate: Date) {
    const checklist = await this.prisma.onboardingChecklist.create({
      data: {
        employeeId,
        status: OnboardingStatus.IN_PROGRESS,
        items: {
          create: this.DEFAULT_ITEMS.map((item) => ({
            title: item.title,
            category: item.category,
            order: item.order,
            dueDate: this.calculateDueDate(startDate, item.dueDate),
          })),
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    return this.serializeChecklist(checklist);
  }

  private calculateDueDate(startDate: Date, offset: string): Date {
    const days = parseInt(
      offset.replace('+', '').replace(' day', '').replace('s', ''),
      10,
    );
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date;
  }

  async getByEmployeeId(employeeId: string) {
    const checklist = await this.prisma.onboardingChecklist.findUnique({
      where: { employeeId },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!checklist) throw new NotFoundException('Onboarding checklist not found');
    return this.serializeChecklist(checklist);
  }

  async markItemComplete(
    employeeId: string,
    itemId: string,
    userId: string,
  ) {
    const checklist = await this.prisma.onboardingChecklist.findUnique({
      where: { employeeId },
    });
    if (!checklist) throw new NotFoundException('Onboarding checklist not found');

    const item = await this.prisma.onboardingItem.findFirst({
      where: { id: itemId, checklistId: checklist.id },
    });
    if (!item) throw new NotFoundException('Onboarding item not found');

    const updated = await this.prisma.onboardingItem.update({
      where: { id: itemId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: userId,
      },
    });

    const allItems = await this.prisma.onboardingItem.findMany({
      where: { checklistId: checklist.id },
    });

    const allComplete = allItems.every((i) =>
      i.id === itemId ? true : i.isCompleted,
    );
    if (allComplete) {
      await this.prisma.onboardingChecklist.update({
        where: { id: checklist.id },
        data: { status: OnboardingStatus.COMPLETED, completedAt: new Date() },
      });
    }

    return this.serializeItem(updated);
  }

  async remove(employeeId: string) {
    const checklist = await this.prisma.onboardingChecklist.findUnique({
      where: { employeeId },
    });
    if (!checklist) throw new NotFoundException('Onboarding checklist not found');

    await this.prisma.onboardingChecklist.delete({
      where: { id: checklist.id },
    });
    return { message: 'Onboarding checklist deleted' };
  }

  private serializeChecklist(
    checklist: {
      id: string;
      employeeId: string;
      status: OnboardingStatus;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      items: Array<{
        id: string;
        checklistId: string;
        title: string;
        description: string | null;
        category: string;
        isCompleted: boolean;
        completedAt: Date | null;
        completedBy: string | null;
        dueDate: Date | null;
        order: number;
      }>;
    },
  ) {
    return {
      id: checklist.id,
      employeeId: checklist.employeeId,
      status: checklist.status,
      completedAt: checklist.completedAt?.toISOString() ?? null,
      createdAt: checklist.createdAt.toISOString(),
      updatedAt: checklist.updatedAt.toISOString(),
      items: checklist.items.map((i) => this.serializeItem(i)),
      progress: {
        completed: checklist.items.filter((i) => i.isCompleted).length,
        total: checklist.items.length,
      },
    };
  }

  private serializeItem(item: {
    id: string;
    checklistId: string;
    title: string;
    description: string | null;
    category: string;
    isCompleted: boolean;
    completedAt: Date | null;
    completedBy: string | null;
    dueDate: Date | null;
    order: number;
  }) {
    return {
      id: item.id,
      checklistId: item.checklistId,
      title: item.title,
      description: item.description,
      category: item.category,
      isCompleted: item.isCompleted,
      completedAt: item.completedAt?.toISOString() ?? null,
      completedBy: item.completedBy,
      dueDate: item.dueDate?.toISOString() ?? null,
      order: item.order,
    };
  }
}
