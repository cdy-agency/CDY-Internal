import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedRbac, getRoleIdByKey } from './seeds/rbac.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedRbac(prisma);

  const forceReseed = process.env.SEED_FORCE === 'true';

  if (!forceReseed) {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      process.stdout.write('Seed skipped: database already contains users\n');
      return;
    }
  } else {
    process.stdout.write('SEED_FORCE=true — wiping users and reseeding\n');
    await prisma.rolePermission.deleteMany();
    await prisma.user.deleteMany();
    await seedRbac(prisma);
  }

  const passwordHash = await bcrypt.hash('CDY@2026!', 10);
  const itRoleId = await getRoleIdByKey(prisma, 'IT_ADMINISTRATOR');

  await prisma.user.create({
    data: {
      email: 'it@cdyagency.com',
      passwordHash,
      firstName: 'Ian',
      lastName: 'Tech',
      roleId: itRoleId,
    },
  });

  process.stdout.write('Seed complete: it@cdyagency.com (password: CDY@2026!)\n');
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
