import { View, Text, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { formatDeliveryEarning } from '../lib/delivery-list-helpers';
import { courierTheme as t } from '../lib/theme';

type Props = {
  value: string | undefined;
  /** Büyük hero satırı (detay üstü). */
  variant?: 'hero' | 'card';
  align?: 'left' | 'right';
  style?: ViewStyle;
};

/** Kurye hakedişi — her zaman KDV hariç tutar gösterilir. */
export function CourierEarningAmount({ value, variant = 'card', align = 'right', style }: Props) {
  const amountStyle: TextStyle = variant === 'hero' ? styles.heroAmount : styles.cardAmount;
  const vatStyle: TextStyle = variant === 'hero' ? styles.heroVat : styles.cardVat;

  return (
    <View style={[styles.wrap, align === 'right' && styles.wrapRight, style]}>
      <Text style={amountStyle}>
        {formatDeliveryEarning(value)}
        <Text style={styles.currency}> ₺</Text>
      </Text>
      <Text style={vatStyle}>KDV hariç</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexShrink: 0 },
  wrapRight: { alignItems: 'flex-end' },
  heroAmount: { color: t.brand, fontSize: 18, fontWeight: '800' },
  cardAmount: { color: t.brand, fontSize: 15, fontWeight: '800' },
  currency: { fontSize: 13, fontWeight: '700' },
  heroVat: { marginTop: 2, fontSize: 11, fontWeight: '600', color: t.inkMuted },
  cardVat: { marginTop: 1, fontSize: 10, fontWeight: '600', color: t.inkMuted, textAlign: 'right' },
});
