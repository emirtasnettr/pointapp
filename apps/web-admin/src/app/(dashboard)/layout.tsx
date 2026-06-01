import type { Metadata } from 'next';
import { DashboardShell } from '@/components/admin/DashboardShell';

export const metadata: Metadata = {
  title: 'Yönetim paneli',
};

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
