import type { LucideIcon } from 'lucide-react-native';
import { FileText, Package } from 'lucide-react-native';

export function deliveryTypeLabel(type: string): string {
  switch (type) {
    case 'DOCUMENT':
      return 'Evrak';
    case 'PACKAGE':
      return 'Paket';
    default:
      return type;
  }
}

export function deliveryTypeMeta(type: string): { Icon: LucideIcon; label: string } | null {
  switch (type) {
    case 'PACKAGE':
      return { Icon: Package, label: 'Paket' };
    case 'DOCUMENT':
      return { Icon: FileText, label: 'Evrak' };
    default:
      return null;
  }
}
