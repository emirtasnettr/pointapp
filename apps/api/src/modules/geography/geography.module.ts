import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { GeographyController } from './geography.controller';
import { GeographyMatrixService } from './geography-matrix.service';
import { StaffGeographyAdminService } from './staff-geography-admin.service';
import { StaffPriceMatrixController } from './staff-price-matrix.controller';

@Module({
  imports: [AuthModule, DeliveriesModule],
  controllers: [GeographyController, StaffPriceMatrixController],
  providers: [GeographyMatrixService, StaffGeographyAdminService],
})
export class GeographyModule {}
