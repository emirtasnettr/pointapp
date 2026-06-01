import { SetMetadata } from '@nestjs/common';

export const STAFF_PERMISSIONS_KEY = 'staff_permissions';

export const RequirePermissions = (...slugs: string[]) =>
  SetMetadata(STAFF_PERMISSIONS_KEY, slugs);
