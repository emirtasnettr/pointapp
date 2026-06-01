import { Platform } from 'react-native';
import { customerTheme as t } from './theme';

/** Teslimat türü kartları — seçilebilir / yakında için ana sayfa ve sihirbazda aynı. */
export function deliveryTypeCardShadow(active: boolean) {
  return Platform.select({
    ios: {
      shadowColor: active ? t.brand : '#28303d',
      shadowOffset: { width: 0, height: active ? 12 : 8 },
      shadowOpacity: active ? 0.14 : 0.06,
      shadowRadius: active ? 22 : 18,
    },
    default: {
      elevation: active ? 5 : 3,
      shadowColor: '#000',
    },
  });
}
