import { PortalWithAuth } from '@/components/customer/PortalWithAuth';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalWithAuth>{children}</PortalWithAuth>;
}
