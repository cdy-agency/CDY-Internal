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
import { SettingsModule } from './settings/settings.module';
import { SettingsService } from './settings/settings.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AuditModule,
    NotificationsModule,
    FinanceModule,
    AutomationModule,
    DebugModule,
    SettingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly settingsService: SettingsService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.settingsService.seed();
  }
}
