import { Module } from '@nestjs/common';
import { ExpoPushService } from './expo-push.service';
import { StaffNotificationsController } from './staff-notifications.controller';
import { StaffNotificationsService } from './staff-notifications.service';

@Module({
  controllers: [StaffNotificationsController],
  providers: [StaffNotificationsService, ExpoPushService],
})
export class NotificationsModule {}
