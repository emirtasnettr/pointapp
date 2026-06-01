import { Controller, Get, Param } from '@nestjs/common';
import { MarketingServicesService } from './marketing-services.service';

@Controller('public/marketing-services')
export class PublicMarketingServicesController {
  constructor(private readonly services: MarketingServicesService) {}

  @Get()
  list() {
    return this.services.listPublic();
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.services.getPublicBySlug(slug);
  }
}
