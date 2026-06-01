import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CourierModule } from '../courier/courier.module';
import { FilesModule } from '../files/files.module';
import { SettingsModule } from '../settings/settings.module';
import { DeliveryCustomerInvoiceService } from './delivery-customer-invoice.service';
import { CourierDeliveriesController } from './courier-deliveries.controller';
import { CustomerAddressesController } from './customer-addresses.controller';
import { CustomerSavedAddressesService } from './customer-saved-addresses.service';
import { CustomerDeliveriesController } from './customer-deliveries.controller';
import { CustomerInvoicesController } from './customer-invoices.controller';
import { CustomerMeController } from './customer-me.controller';
import { CustomerNotificationController } from './customer-notification.controller';
import { CustomerNotificationService } from './customer-notification.service';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { DeliveryPricingService } from './delivery-pricing.service';
import { PublicDeliveriesController } from './public-deliveries.controller';
import { PublicDeliveryTrackService } from './public-delivery-track.service';

@Module({
  imports: [AuthModule, CourierModule, FilesModule, SettingsModule],
  controllers: [
    DeliveriesController,
    PublicDeliveriesController,
    CourierDeliveriesController,
    CustomerDeliveriesController,
    CustomerInvoicesController,
    CustomerAddressesController,
    CustomerMeController,
    CustomerNotificationController,
  ],
  providers: [
    DeliveriesService,
    DeliveryPricingService,
    DeliveryCustomerInvoiceService,
    CustomerSavedAddressesService,
    CustomerNotificationService,
    PublicDeliveryTrackService,
  ],
  exports: [DeliveriesService, DeliveryPricingService],
})
export class DeliveriesModule {}
