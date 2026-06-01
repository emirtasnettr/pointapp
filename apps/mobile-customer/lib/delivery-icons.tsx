import type { LucideIcon } from 'lucide-react-native';
import {
  CircleCheck,
  Clock,
  Inbox,
  MapPin,
  Navigation,
  Package,
  UserCheck,
  XCircle,
} from 'lucide-react-native';

export function statusIconFor(status: string): LucideIcon {
  switch (status) {
    case 'PENDING':
      return Clock;
    case 'POOL':
      return Inbox;
    case 'COURIER_ASSIGNED':
      return UserCheck;
    case 'COURIER_EN_ROUTE':
      return Navigation;
    case 'PACKAGE_PICKED_UP':
      return Package;
    case 'DELIVERED':
      return CircleCheck;
    case 'CANCELLED':
      return XCircle;
    default:
      return MapPin;
  }
}
