import { Controller, Get, Param } from '@nestjs/common';
import { LegalPagesService } from './legal-pages.service';

@Controller('public/legal')
export class PublicLegalPagesController {
  constructor(private readonly legal: LegalPagesService) {}

  @Get()
  list() {
    return this.legal.listPublic('customer');
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.legal.getPublic('customer', slug);
  }
}
