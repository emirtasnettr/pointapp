import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { SettingsModule } from '../settings/settings.module';
import { CourierAvailabilityService } from './courier-availability.service';
import { CourierBankController } from './courier-bank.controller';
import { CourierBankService } from './courier-bank.service';
import { CourierOnboardingController } from './courier-onboarding.controller';
import { CourierOnboardingService } from './courier-onboarding.service';
import { CourierNotificationService } from './courier-notification.service';
import { CourierProfileService } from './courier-profile.service';
import { CourierConsentsController } from './courier-consents.controller';
import { CourierConsentsService } from './courier-consents.service';
import { CourierPayoutController } from './courier-payout.controller';
import { CourierPayoutService } from './courier-payout.service';
import { StaffCourierOnboardingController } from './staff-courier-onboarding.controller';
import { StaffCourierOnboardingService } from './staff-courier-onboarding.service';
import { StaffCouriersController } from './staff-couriers.controller';
import { StaffCouriersService } from './staff-couriers.service';
import { StaffCustomersController } from './staff-customers.controller';
import { StaffCustomersService } from './staff-customers.service';
import { StaffPayoutRequestsController } from './staff-payout-requests.controller';
import { StaffPayoutRequestsService } from './staff-payout-requests.service';

@Module({
  imports: [AuthModule, FilesModule, SettingsModule],
  controllers: [
    CourierBankController,
    CourierConsentsController,
    CourierOnboardingController,
    CourierPayoutController,
    StaffCourierOnboardingController,
    StaffCouriersController,
    StaffCustomersController,
    StaffPayoutRequestsController,
  ],
  providers: [
    CourierAvailabilityService,
    CourierBankService,
    CourierNotificationService,
    CourierProfileService,
    CourierConsentsService,
    CourierOnboardingService,
    CourierPayoutService,
    StaffCourierOnboardingService,
    StaffCouriersService,
    StaffCustomersService,
    StaffPayoutRequestsService,
  ],
  exports: [CourierOnboardingService, CourierAvailabilityService],
})
export class CourierModule {}
