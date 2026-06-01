import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BroadcastCustomerPushDto } from './dto/broadcast-customer-push.dto';
import { CreateStaffNotificationDto } from './dto/create-staff-notification.dto';
import { ListStaffNotificationsDto } from './dto/list-staff-notifications.dto';
import { StaffNotificationsService } from './staff-notifications.service';

@Controller('staff/notifications')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffNotificationsController {
  constructor(private readonly staffNotifications: StaffNotificationsService) {}

  @Post()
  create(@Body() body: CreateStaffNotificationDto) {
    return this.staffNotifications.create(body);
  }

  @Post('broadcast-customers')
  broadcastCustomers(@Body() body: BroadcastCustomerPushDto) {
    return this.staffNotifications.broadcastCustomerPush(body);
  }

  @Get()
  list(@Query() query: ListStaffNotificationsDto) {
    return this.staffNotifications.list(query);
  }
}
