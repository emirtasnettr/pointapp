import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CourierAuthService } from './courier-auth.service';
import { CustomerAuthService } from './customer-auth.service';
import { StaffAuthService } from './staff-auth.service';
import { CourierLoginDto } from './dto/courier-login.dto';

@Controller('auth')
export class CourierAuthController {
  constructor(
    private readonly courierAuth: CourierAuthService,
    private readonly customerAuth: CustomerAuthService,
    private readonly staffAuth: StaffAuthService,
  ) {}

  @Post('courier/login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  courierLogin(@Body() body: CourierLoginDto) {
    return this.courierAuth.courierLogin(body);
  }

  @Post('customer/login')
  customerLogin(@Body() body: CourierLoginDto) {
    return this.customerAuth.customerLogin(body);
  }

  @Post('staff/login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  staffLogin(@Body() body: CourierLoginDto) {
    return this.staffAuth.staffLogin(body);
  }
}
