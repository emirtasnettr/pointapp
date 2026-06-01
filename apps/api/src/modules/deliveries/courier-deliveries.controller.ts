import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { CourierJwtUser } from '../auth/strategies/courier-jwt.strategy';
import { CourierAvailabilityService } from '../courier/courier-availability.service';
import { CourierOnboardingService } from '../courier/courier-onboarding.service';
import { DeliveriesService } from './deliveries.service';

@Controller('courier/deliveries')
@UseGuards(AuthGuard('courier-jwt'))
export class CourierDeliveriesController {
  constructor(
    private readonly deliveries: DeliveriesService,
    private readonly onboarding: CourierOnboardingService,
    private readonly availability: CourierAvailabilityService,
  ) {}

  @Get('pool')
  async pool(@Req() req: Request & { user: CourierJwtUser }) {
    await this.onboarding.assertCanDeliver(req.user.userId);
    await this.availability.assertOnlineForPool(req.user.userId);
    return this.deliveries.listPoolForCourier();
  }

  @Get(':ref/detail')
  detail(@Req() req: Request & { user: CourierJwtUser }, @Param('ref') ref: string) {
    return this.deliveries.getOneForCourierVisibility(req.user.courierProfileId, ref);
  }

  @Post(':ref/claim')
  async claim(@Req() req: Request & { user: CourierJwtUser }, @Param('ref') ref: string) {
    await this.onboarding.assertCanDeliver(req.user.userId);
    await this.availability.assertOnlineForPool(req.user.userId);
    return this.deliveries.courierClaimFromPool(req.user.userId, req.user.courierProfileId, ref);
  }

  @Post(':ref/start-route')
  async startRoute(@Req() req: Request & { user: CourierJwtUser }, @Param('ref') ref: string) {
    await this.onboarding.assertCanDeliver(req.user.userId);
    return this.deliveries.courierMarkEnRoute(req.user.userId, req.user.courierProfileId, ref);
  }

  @Post(':ref/pickup')
  async pickup(@Req() req: Request & { user: CourierJwtUser }, @Param('ref') ref: string) {
    await this.onboarding.assertCanDeliver(req.user.userId);
    return this.deliveries.courierMarkPickedUp(req.user.userId, req.user.courierProfileId, ref);
  }

  @Post(':ref/complete')
  async complete(@Req() req: Request & { user: CourierJwtUser }, @Param('ref') ref: string) {
    await this.onboarding.assertCanDeliver(req.user.userId);
    return this.deliveries.courierMarkDelivered(req.user.userId, req.user.courierProfileId, ref);
  }
}
