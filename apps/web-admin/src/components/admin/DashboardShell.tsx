'use client';

import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AppShell } from '@/components/admin/AppShell';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <AppShell>{children}</AppShell>
    </AdminAuthGate>
  );
}
