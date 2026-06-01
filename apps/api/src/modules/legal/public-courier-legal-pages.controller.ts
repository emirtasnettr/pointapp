import { Controller, Get, Param } from '@nestjs/common';
import { LegalPagesService } from './legal-pages.service';

@Controller('public/courier/legal')
export class PublicCourierLegalPagesController {
  constructor(private readonly legal: LegalPagesService) {}

  @Get()
  list() {
    return this.legal.listPublic('courier');
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.legal.getPublic('courier', slug);
  }
}
