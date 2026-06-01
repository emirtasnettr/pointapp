import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { GeographyModule } from './modules/geography/geography.module';
import { HealthModule } from './modules/health/health.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { StatsModule } from './modules/stats/stats.module';
import { AuthModule } from './modules/auth/auth.module';
import { CourierModule } from './modules/courier/courier.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LegalModule } from './modules/legal/legal.module';
import { MarketingCampaignsModule } from './modules/marketing-campaigns/marketing-campaigns.module';
import { MarketingServicesModule } from './modules/marketing-services/marketing-services.module';

/**
 * Modular monolith: feature modules (auth, rbac, deliveries, …) mount here.
 * Cross-cutting: Config, Throttler, Prisma, Redis, Socket gateway.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 60000, limit: 200 },
    ]),
    PrismaModule,
    HealthModule,
    GeographyModule,
    AuthModule,
    CourierModule,
    NotificationsModule,
    DeliveriesModule,
    StatsModule,
    CampaignsModule,
    FinanceModule,
    ReportsModule,
    AuditModule,
    SettingsModule,
    LegalModule,
    MarketingCampaignsModule,
    MarketingServicesModule,
  ],
})
export class AppModule {}
