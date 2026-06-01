/** AppRole → kısa Türkçe etiket (panel) */
export function staffRoleLabel(role: string): string {
  const map: Record<string, string> = {
    SYSTEM_ADMIN: 'Sistem yöneticisi',
    GENERAL_MANAGER: 'Genel müdür',
    OPERATIONS_MANAGER: 'Operasyon müdürü',
    OPERATIONS_SPECIALIST: 'Operasyon uzmanı',
    ACCOUNTING_SPECIALIST: 'Muhasebe uzmanı',
    CUSTOMER: 'Müşteri',
    COURIER: 'Kurye',
  };
  return map[role] ?? role;
}
