import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { getRoleIdByKey } from '../src/rbac/run-rbac-seed';

describe('Finance RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tokens: Record<string, string> = {};

  async function login(email: string, password = 'CDY@2026!'): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.data.accessToken as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash('CDY@2026!', 10);
    const pmRoleId = await getRoleIdByKey(prisma, 'PROJECT_MANAGER');
    const teamRoleId = await getRoleIdByKey(prisma, 'TEAM_MEMBER');

    await prisma.user.upsert({
      where: { email: 'pm@cdy.com' },
      update: {},
      create: {
        email: 'pm@cdy.com',
        passwordHash,
        firstName: 'Project',
        lastName: 'Manager',
        roleId: pmRoleId,
      },
    });
    await prisma.user.upsert({
      where: { email: 'team@cdy.com' },
      update: {},
      create: {
        email: 'team@cdy.com',
        passwordHash,
        firstName: 'Team',
        lastName: 'Member',
        roleId: teamRoleId,
      },
    });

    tokens['ceo@cdy.com'] = await login('ceo@cdy.com');
    tokens['finance@cdy.com'] = await login('finance@cdy.com');
    tokens['sales@cdy.com'] = await login('sales@cdy.com');
    tokens['pm@cdy.com'] = await login('pm@cdy.com');
    tokens['team@cdy.com'] = await login('team@cdy.com');
    tokens['it@cdy.com'] = await login('it@cdy.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('CEO can GET /invoices (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokens['ceo@cdy.com']}`)
      .expect(200);
  });

  it('CEO cannot POST /invoices (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokens['ceo@cdy.com']}`)
      .send({
        clientId: 'test-client',
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
        dueDate: new Date().toISOString(),
      })
      .expect(403);
  });

  it('FINANCE_MANAGER can POST /invoices (201)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokens['finance@cdy.com']}`)
      .send({
        clientId: 'rbac-test-client',
        lineItems: [{ description: 'RBAC test', quantity: 1, unitPrice: 50 }],
        dueDate: new Date().toISOString(),
      })
      .expect(201);
  });

  it('SALES_AGENT cannot GET /invoices (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokens['sales@cdy.com']}`)
      .expect(403);
  });

  it('SALES_AGENT can GET /commissions/my (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/commissions/my')
      .set('Authorization', `Bearer ${tokens['sales@cdy.com']}`)
      .expect(200);
  });

  it('SALES_AGENT cannot GET /commissions (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/commissions')
      .set('Authorization', `Bearer ${tokens['sales@cdy.com']}`)
      .expect(403);
  });

  it('TEAM_MEMBER cannot GET /finance/summary (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/finance/summary')
      .set('Authorization', `Bearer ${tokens['team@cdy.com']}`)
      .expect(403);
  });

  it('PROJECT_MANAGER can GET /invoices (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokens['pm@cdy.com']}`)
      .expect(200);
  });

  it('PROJECT_MANAGER cannot DELETE /invoices/:id (403)', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokens['finance@cdy.com']}`)
      .expect(200);

    const invoiceId = list.body.data.data[0]?.id as string | undefined;
    if (!invoiceId) return;

    await request(app.getHttpServer())
      .delete(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${tokens['pm@cdy.com']}`)
      .expect(403);
  });

  it('CEO can GET /audit (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${tokens['ceo@cdy.com']}`)
      .expect(200);
  });

  it('IT cannot GET /invoices (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokens['it@cdy.com']}`)
      .expect(403);
  });

  it('IT can GET /it/users (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/it/users')
      .set('Authorization', `Bearer ${tokens['it@cdy.com']}`)
      .expect(200);
  });
});
