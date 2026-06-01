import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { CourierJwtUser } from '../auth/strategies/courier-jwt.strategy';
import { CourierAvailabilityService } from './courier-availability.service';
import { CourierBankService } from './courier-bank.service';
import { CourierNotificationService } from './courier-notification.service';
import { CourierProfileService } from './courier-profile.service';
import { SetCourierAvailabilityDto } from './dto/set-courier-availability.dto';
import { UpdateCourierBankDto } from './dto/update-courier-bank.dto';
import { UpdateCourierNotificationSettingsDto } from './dto/update-courier-notification-settings.dto';

@Controller('courier/me')
@UseGuards(AuthGuard('courier-jwt'))
export class CourierBankController {
  constructor(
    private readonly bank: CourierBankService,
    private readonly profile: CourierProfileService,
    private readonly notifications: CourierNotificationService,
    private readonly availability: CourierAvailabilityService,
  ) {}

  @Get('availability')
  getAvailability(@Req() req: Request & { user: CourierJwtUser }) {
    return this.availability.get(req.user.userId);
  }

  @Patch('availability')
  setAvailability(
    @Req() req: Request & { user: CourierJwtUser },
    @Body() body: SetCourierAvailabilityDto,
  ) {
    return this.availability.set(req.user.userId, body.online);
  }

  @Get('profile')
  getProfile(@Req() req: Request & { user: CourierJwtUser }) {
    return this.profile.getProfile(req.user.userId);
  }

  @Get('bank')
  getBank(@Req() req: Request & { user: CourierJwtUser }) {
    return this.bank.getBank(req.user.userId);
  }

  @Patch('bank')
  updateBank(@Req() req: Request & { user: CourierJwtUser }, @Body() body: UpdateCourierBankDto) {
    return this.bank.updateBank(req.user.userId, body);
  }

  @Get('support-line')
  getSupportLine() {
    return this.bank.getSupportLine();
  }

  @Get('notification-settings')
  getNotificationSettings(@Req() req: Request & { user: CourierJwtUser }) {
    return this.notifications.getSettings(req.user.userId);
  }

  @Patch('notification-settings')
  updateNotificationSettings(
    @Req() req: Request & { user: CourierJwtUser },
    @Body() body: UpdateCourierNotificationSettingsDto,
  ) {
    return this.notifications.updateSettings(req.user.userId, body);
  }
}
