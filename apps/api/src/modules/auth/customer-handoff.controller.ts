import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { CustomerJwtUser } from './strategies/customer-jwt.strategy';
import { CustomerHandoffService } from './customer-handoff.service';
import { RedeemHandoffDto } from './dto/redeem-handoff.dto';

@Controller('auth/customer')
export class CustomerHandoffController {
  constructor(private readonly handoff: CustomerHandoffService) {}

  @Post('handoff')
  @UseGuards(AuthGuard('customer-jwt'))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Req() req: Request & { user: CustomerJwtUser }) {
    return this.handoff.createCode(req.user.userId);
  }

  @Post('handoff/redeem')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  redeem(@Body() body: RedeemHandoffDto) {
    return this.handoff.redeemCode(body.code);
  }
}
