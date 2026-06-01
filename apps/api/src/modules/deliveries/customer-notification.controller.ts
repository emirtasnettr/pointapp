import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { CustomerJwtUser } from '../auth/strategies/customer-jwt.strategy';
import { CustomerNotificationService } from './customer-notification.service';
import { UpdateCustomerNotificationSettingsDto } from './dto/update-customer-notification-settings.dto';

@Controller('customer/me')
@UseGuards(AuthGuard('customer-jwt'))
export class CustomerNotificationController {
  constructor(private readonly notifications: CustomerNotificationService) {}

  @Get('notification-settings')
  get(@Req() req: Request & { user: CustomerJwtUser }) {
    return this.notifications.getSettings(req.user.userId);
  }

  @Patch('notification-settings')
  patch(
    @Req() req: Request & { user: CustomerJwtUser },
    @Body() body: UpdateCustomerNotificationSettingsDto,
  ) {
    return this.notifications.updateSettings(req.user.userId, body);
  }
}
