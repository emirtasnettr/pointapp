import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CustomerRegisterService } from './customer-register.service';
import { CustomerRegisterSendSmsDto } from './dto/customer-register-send-sms.dto';
import { CustomerRegisterDto } from './dto/customer-register.dto';

@Controller('auth')
export class CustomerRegisterController {
  constructor(private readonly customerRegister: CustomerRegisterService) {}

  @Post('customer/register/send-sms')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendSms(@Body() dto: CustomerRegisterSendSmsDto) {
    return this.customerRegister.sendSignupSms(dto);
  }

  @Post('customer/register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body() dto: CustomerRegisterDto) {
    return this.customerRegister.register(dto);
  }
}
