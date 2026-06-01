import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [DeliveriesModule, AuthModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
