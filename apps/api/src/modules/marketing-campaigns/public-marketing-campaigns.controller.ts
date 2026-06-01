import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicListMarketingCampaignsDto } from './dto/public-list-marketing-campaigns.dto';
import { MarketingCampaignsService } from './marketing-campaigns.service';

@Controller('public/marketing-campaigns')
export class PublicMarketingCampaignsController {
  constructor(private readonly campaigns: MarketingCampaignsService) {}

  @Get()
  list(@Query() query: PublicListMarketingCampaignsDto) {
    return this.campaigns.listPublic(query);
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.campaigns.getPublicBySlug(slug);
  }
}
