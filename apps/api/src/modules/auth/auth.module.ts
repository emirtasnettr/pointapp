import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getJwtSecret } from '../../config/jwt-secret';
import { CustomerHandoffController } from './customer-handoff.controller';
import { CustomerHandoffService } from './customer-handoff.service';
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
import { StaffPermissionsGuard } from './rbac/staff-permissions.guard';

@Module({
  imports: [
    PassportModule.register({}),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: getJwtSecret(config),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    CourierAuthController,
    CourierRegisterController,
    CustomerRegisterController,
    CustomerHandoffController,
    StaffMeController,
  ],
  providers: [
    CourierAuthService,
    CourierRegisterService,
    CustomerAuthService,
    CustomerRegisterService,
    CustomerHandoffService,
    StaffAuthService,
    CourierJwtStrategy,
    CustomerJwtStrategy,
    StaffJwtStrategy,
    StaffPermissionsGuard,
  ],
  exports: [
    JwtModule,
    CourierJwtStrategy,
    CustomerJwtStrategy,
    StaffJwtStrategy,
    StaffPermissionsGuard,
    CourierAuthService,
    CourierRegisterService,
    CustomerAuthService,
    CustomerRegisterService,
    CustomerHandoffService,
    StaffAuthService,
  ],
})
export class AuthModule {}
