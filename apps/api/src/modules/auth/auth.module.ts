import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CourierAuthController } from './courier-auth.controller';
import { CourierRegisterController } from './courier-register.controller';
import { CourierRegisterService } from './courier-register.service';
import { CustomerRegisterController } from './customer-register.controller';
import { CustomerRegisterService } from './customer-register.service';
import { StaffMeController } from './staff-me.controller';
import { CourierAuthService } from './courier-auth.service';
import { CustomerAuthService } from './customer-auth.service';
import { StaffAuthService } from './staff-auth.service';
import { CourierJwtStrategy } from './strategies/courier-jwt.strategy';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { StaffJwtStrategy } from './strategies/staff-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({}),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'point-dev-jwt-change-me'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CourierAuthController, CourierRegisterController, CustomerRegisterController, StaffMeController],
  providers: [
    CourierAuthService,
    CourierRegisterService,
    CustomerAuthService,
    CustomerRegisterService,
    StaffAuthService,
    CourierJwtStrategy,
    CustomerJwtStrategy,
    StaffJwtStrategy,
  ],
  exports: [
    JwtModule,
    CourierJwtStrategy,
    CustomerJwtStrategy,
    StaffJwtStrategy,
    CourierAuthService,
    CourierRegisterService,
    CustomerAuthService,
    CustomerRegisterService,
    StaffAuthService,
  ],
})
export class AuthModule {}
