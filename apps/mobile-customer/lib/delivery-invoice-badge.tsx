import { StyleSheet, Text, View } from 'react-native';
import { customerTheme as t } from './theme';

export type DeliveryInvoiceBadgeKind = 'none' | 'preparing' | 'ready';

export function deliveryInvoiceBadgeKind(
  status: string,
  customerInvoiceCount?: number,
): DeliveryInvoiceBadgeKind {
  if (status !== 'DELIVERED') return 'none';
  return (customerInvoiceCount ?? 0) > 0 ? 'ready' : 'preparing';
}

const LABEL: Record<Exclude<DeliveryInvoiceBadgeKind, 'none'>, string> = {
  preparing: 'Fatura Hazırlanıyor',
  ready: 'Fatura Var',
};

export function DeliveryInvoiceBadge({
  status,
  customerInvoiceCount,
}: {
  status: string;
  customerInvoiceCount?: number;
}) {
  const kind = deliveryInvoiceBadgeKind(status, customerInvoiceCount);
  if (kind === 'none') return null;
  const preparing = kind === 'preparing';
  return (
    <View
      style={[
        styles.badge,
        preparing ? styles.preparing : styles.ready,
      ]}
    >
      <Text style={[styles.txt, preparing ? styles.preparingTxt : styles.readyTxt]}>{LABEL[kind]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  preparing: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  ready: {
    backgroundColor: t.brandMuted,
    borderColor: t.brandBorder,
  },
  txt: { fontSize: 10, fontWeight: '700' },
  preparingTxt: { color: '#b45309' },
  readyTxt: { color: t.success },
});
