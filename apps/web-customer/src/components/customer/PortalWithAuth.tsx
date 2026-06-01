'use client';

import { CustomerAuthGate } from '@/components/customer/CustomerAuthGate';
import { PortalShell } from '@/components/customer/PortalShell';

export function PortalWithAuth({ children }: { children: React.ReactNode }) {
  return (
    <CustomerAuthGate>
      <PortalShell>{children}</PortalShell>
    </CustomerAuthGate>
  );
}
