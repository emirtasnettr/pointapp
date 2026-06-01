import { AppRole } from '@prisma/client';

export const StaffPerm = {
  DELIVERIES_READ: 'deliveries.read',
  DELIVERIES_WRITE: 'deliveries.write',
  SETTINGS_MANAGE: 'settings.manage',
  CAMPAIGNS_READ: 'campaigns.read',
  FINANCE_READ: 'finance.read',
  FINANCE_WRITE: 'finance.write',
  REPORTS_READ: 'reports.read',
  AUDIT_READ: 'audit.read',
  NOTIFICATIONS_WRITE: 'notifications.write',
  USERS_MANAGE: 'users.manage',
  MARKETING_MANAGE: 'marketing.manage',
} as const;

export type StaffPermissionSlug = (typeof StaffPerm)[keyof typeof StaffPerm];

const ROLE_PERMISSIONS: Partial<Record<AppRole, readonly string[]>> = {
  [AppRole.SYSTEM_ADMIN]: ['*'],
  [AppRole.GENERAL_MANAGER]: [
    StaffPerm.DELIVERIES_READ,
    StaffPerm.DELIVERIES_WRITE,
    StaffPerm.CAMPAIGNS_READ,
    StaffPerm.FINANCE_READ,
    StaffPerm.FINANCE_WRITE,
    StaffPerm.REPORTS_READ,
    StaffPerm.AUDIT_READ,
    StaffPerm.NOTIFICATIONS_WRITE,
  ],
  [AppRole.OPERATIONS_MANAGER]: [
    StaffPerm.DELIVERIES_READ,
    StaffPerm.DELIVERIES_WRITE,
    StaffPerm.CAMPAIGNS_READ,
    StaffPerm.NOTIFICATIONS_WRITE,
  ],
  [AppRole.OPERATIONS_SPECIALIST]: [StaffPerm.DELIVERIES_READ, StaffPerm.DELIVERIES_WRITE],
  [AppRole.ACCOUNTING_SPECIALIST]: [
    StaffPerm.DELIVERIES_READ,
    StaffPerm.FINANCE_READ,
    StaffPerm.FINANCE_WRITE,
    StaffPerm.REPORTS_READ,
  ],
};

export function staffHasPermission(appRole: AppRole, slug: string): boolean {
  const perms = ROLE_PERMISSIONS[appRole];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.includes(slug);
}

/** Manuel fiyat girişi — üst düzey operasyon rolleri. */
export function staffMaySetManualDeliveryPrice(appRole: AppRole): boolean {
  return (
    appRole === AppRole.SYSTEM_ADMIN ||
    appRole === AppRole.GENERAL_MANAGER ||
    appRole === AppRole.OPERATIONS_MANAGER
  );
}
