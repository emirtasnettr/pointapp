import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExpoPushService } from './expo-push.service';
import { StaffNotificationsController } from './staff-notifications.controller';
import { StaffNotificationsService } from './staff-notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffNotificationsController],
  providers: [StaffNotificationsService, ExpoPushService],
})
export class NotificationsModule {}
