import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { DeliveryVatPricing } from '../lib/delivery-vat';
import { formatTry } from '../lib/delivery-display';
import { customerTheme as t } from '../lib/theme';

type Props = {
  pricing: DeliveryVatPricing | null;
  loading?: boolean;
  compact?: boolean;
};

export function DeliveryVatSummary({ pricing, loading, compact }: Props) {
  if (loading) {
    return (
      <View style={[styles.box, compact && styles.boxCompact]}>
        <ActivityIndicator color={t.brand} size="small" />
      </View>
    );
  }

  if (!pricing) return null;

  return (
    <View style={[styles.box, compact && styles.boxCompact]}>
      <PriceLine label="Teslimat ücreti" value={formatTry(pricing.serviceAmount)} />
      <PriceLine label="KDV (%20)" value={formatTry(pricing.vatAmount)} muted />
      <View style={styles.divider} />
      <PriceLine label="Genel toplam" value={formatTry(pricing.totalPrice)} strong />
    </View>
  );
}

function PriceLine({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.lbl, muted && styles.lblMuted, strong && styles.lblStrong]}>{label}</Text>
      <Text style={[styles.val, muted && styles.valMuted, strong && styles.valStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: t.radiusSm,
    backgroundColor: t.surfaceMuted,
    borderWidth: 1,
    borderColor: t.border,
    gap: 8,
  },
  boxCompact: { marginTop: 0, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lbl: { fontSize: 14, fontWeight: '600', color: t.inkSecondary },
  lblMuted: { fontWeight: '500', color: t.inkMuted },
  lblStrong: { fontSize: 15, fontWeight: '800', color: t.ink },
  val: { fontSize: 15, fontWeight: '700', color: t.ink },
  valMuted: { fontWeight: '600', color: t.inkSecondary },
  valStrong: { fontSize: 18, fontWeight: '800', color: t.brand },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 2 },
});
