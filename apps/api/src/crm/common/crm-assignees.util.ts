import { PrismaService } from '../../prisma/prisma.service';

/** Role keys excluded from CRM assignment / leaderboards. */
export const CRM_EXCLUDED_ASSIGNEE_ROLES = new Set([
  'IT_ADMINISTRATOR',
  'IT',
]);

export type CrmAssignableUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

/**
 * Every non-deleted user account except IT — shared by lead assignment,
 * commission rules, leaderboards, and sales performance reports.
 */
export async function findCrmAssignableUsers(
  prisma: PrismaService,
): Promise<CrmAssignableUser[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: { select: { key: true } },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return users
    .filter((u) => !CRM_EXCLUDED_ASSIGNEE_ROLES.has(u.role.key))
    .map(({ id, firstName, lastName, email }) => ({
      id,
      firstName,
      lastName,
      email,
    }));
}
