import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FinanceModule } from './finance/finance.module';
import { AutomationModule } from './automation/automation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { DebugModule } from './debug/debug.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionGuard } from './auth/guards/permission.guard';
import { SettingsModule } from './settings/settings.module';
import { SettingsService } from './settings/settings.service';
import { HrSettingsService } from './hr/settings/hr-settings.service';
import { CacheModule } from './cache/cache.module';
import { RbacModule } from './rbac/rbac.module';
import { CrmModule } from './crm/crm.module';
import { HrModule } from './hr/hr.module';
import { HrSettingsModule } from './hr/settings/hr-settings.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    CacheModule,
    PrismaModule,
    RbacModule,
    AuthModule,
    AuditModule,
    NotificationsModule,
    FinanceModule,
    CrmModule,
    HrModule,
    HrSettingsModule,
    ProjectsModule,
    AutomationModule,
    DebugModule,
    SettingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly hrSettingsService: HrSettingsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.settingsService.seed();
    await this.hrSettingsService.onApplicationBootstrap();
  }
}
