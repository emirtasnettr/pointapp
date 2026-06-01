import { Controller, Get } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';

@Controller('public/courier/company-tax')
export class PublicCourierCompanyTaxController {
  constructor(private readonly systemConfig: SystemConfigService) {}

  @Get()
  get() {
    return this.systemConfig.getCompanyTaxInfo();
  }
}
