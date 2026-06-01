import { staffRoleLabel } from './staff-role';

/** API `CreateStaffUserDto` / `UpdateStaffUserDto` ile uyumlu panel rolleri */
export const STAFF_ASSIGNABLE_ROLES = [
  'SYSTEM_ADMIN',
  'GENERAL_MANAGER',
  'OPERATIONS_MANAGER',
  'OPERATIONS_SPECIALIST',
  'ACCOUNTING_SPECIALIST',
] as const;

export type StaffAssignableRole = (typeof STAFF_ASSIGNABLE_ROLES)[number];

export function staffAssignableRoleOptions() {
  return STAFF_ASSIGNABLE_ROLES.map((role) => ({
    value: role,
    label: staffRoleLabel(role),
  }));
}
