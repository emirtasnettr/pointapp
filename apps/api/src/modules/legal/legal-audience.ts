import {
  getLegalPageDef,
  isLegalPageSlug,
  LEGAL_PAGES,
  type LegalPageDef,
} from './legal-pages.constants';
import {
  getCourierLegalPageDef,
  isCourierLegalPageSlug,
  COURIER_LEGAL_PAGES,
} from './courier-legal-pages.constants';

export type LegalAudience = 'customer' | 'courier';

export function legalPagesForAudience(audience: LegalAudience): readonly LegalPageDef[] {
  return audience === 'customer' ? LEGAL_PAGES : COURIER_LEGAL_PAGES;
}

export function getLegalPageDefForAudience(
  audience: LegalAudience,
  slug: string,
): LegalPageDef | undefined {
  return audience === 'customer' ? getLegalPageDef(slug) : getCourierLegalPageDef(slug);
}

export function isLegalPageSlugForAudience(audience: LegalAudience, slug: string): boolean {
  return audience === 'customer' ? isLegalPageSlug(slug) : isCourierLegalPageSlug(slug);
}
