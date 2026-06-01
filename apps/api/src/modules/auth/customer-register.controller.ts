import { Body, Controller, Post } from '@nestjs/common';
import { CustomerRegisterService } from './customer-register.service';
import { CustomerRegisterSendSmsDto } from './dto/customer-register-send-sms.dto';
import { CustomerRegisterDto } from './dto/customer-register.dto';

@Controller('auth')
export class CustomerRegisterController {
  constructor(private readonly customerRegister: CustomerRegisterService) {}

  @Post('customer/register/send-sms')
  sendSms(@Body() dto: CustomerRegisterSendSmsDto) {
    return this.customerRegister.sendSignupSms(dto);
  }

  @Post('customer/register')
  register(@Body() dto: CustomerRegisterDto) {
    return this.customerRegister.register(dto);
  }
}
