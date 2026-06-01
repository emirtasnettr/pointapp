import { Body, Controller, Post } from '@nestjs/common';
import { CourierRegisterService } from './courier-register.service';
import { CourierRegisterSendSmsDto } from './dto/courier-register-send-sms.dto';
import { CourierRegisterDto } from './dto/courier-register.dto';

@Controller('auth')
export class CourierRegisterController {
  constructor(private readonly courierRegister: CourierRegisterService) {}

  @Post('courier/register/send-sms')
  sendSms(@Body() dto: CourierRegisterSendSmsDto) {
    return this.courierRegister.sendSignupSms(dto);
  }

  @Post('courier/register')
  register(@Body() dto: CourierRegisterDto) {
    return this.courierRegister.register(dto);
  }
}
