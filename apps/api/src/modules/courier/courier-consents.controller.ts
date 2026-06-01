import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { CourierJwtUser } from '../auth/strategies/courier-jwt.strategy';
import { CourierConsentsService } from './courier-consents.service';
import { AcceptCourierConsentsDto } from './dto/accept-courier-consents.dto';

@Controller('courier/me')
@UseGuards(AuthGuard('courier-jwt'))
export class CourierConsentsController {
  constructor(private readonly consents: CourierConsentsService) {}

  @Get('consents')
  get(@Req() req: Request & { user: CourierJwtUser }) {
    return this.consents.getStatus(req.user.userId);
  }

  @Post('consents')
  accept(@Req() req: Request & { user: CourierJwtUser }, @Body() body: AcceptCourierConsentsDto) {
    return this.consents.accept(req.user.userId, body);
  }
}
