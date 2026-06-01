import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronRight, FileText, ListOrdered, MapPinned, PlusCircle } from 'lucide-react-native';
import { HomeDeliveryTypeCarousel } from '../../components/HomeDeliveryTypeCarousel';
import { GlassCard } from '../../components/GlassCard';
import { apiGetAuth } from '../../lib/api';
import { addCalendarDaysIstanbul, formatYmdIstanbul } from '../../lib/istanbul-calendar';
import { deliveryStatusLabel, deliveryStatusTone } from '../../lib/delivery-status';
import { statusIconFor } from '../../lib/delivery-icons';
import { DeliveryInvoiceBadge } from '../../lib/delivery-invoice-badge';
import { deliveryRouteSummary } from '../../lib/address-route';
import { customerTheme as t } from '../../lib/theme';

type Row = {
  id: string;
  orderNumber: number;
  status: string;
  customerInvoiceCount?: number;
  pickupAddress?: { label?: string; line1?: string; city?: string };
  dropoffAddress?: { label?: string; line1?: string; city?: string };
};

const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED']);

function isActiveDelivery(row: Row): boolean {
  return !TERMINAL_STATUSES.has(row.status);
}

export default function HomeTab() {
  const router = useRouter();
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const to = formatYmdIstanbul();
      const from = addCalendarDaysIstanbul(to, -364);
      const qs = new URLSearchParams({ take: '100', fromDate: from, toDate: to });
      const del = await apiGetAuth<{ items: Row[] }>(`/customer/deliveries?${qs.toString()}`);
      setList(del.items ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const actives = list.filter(isActiveDelivery);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={t.brand} />
      }
    >
      <View style={styles.quickRow}>
        <Pressable
          style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/create')}
        >
          <View style={[styles.quickIcon, { backgroundColor: t.brandMuted }]}>
            <PlusCircle color={t.brand} size={26} strokeWidth={2.2} />
          </View>
          <Text style={styles.quickTitle}>Yeni teslimat</Text>
          <Text style={styles.quickSub}>Tür seçerek veya buradan başlayın</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/orders')}
        >
          <View style={[styles.quickIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
            <ListOrdered color="#5c61d6" size={26} strokeWidth={2.1} />
          </View>
          <Text style={styles.quickTitle}>Teslimatlar</Text>
          <Text style={styles.quickSub}>Tüm hareketler</Text>
        </Pressable>
      </View>
      <Pressable
        style={({ pressed }) => [styles.invoicesBanner, pressed && styles.pressed]}
        onPress={() => router.push('/invoices' as never)}
      >
        <FileText color={t.brand} size={20} strokeWidth={2.2} />
        <View style={styles.invoicesBannerText}>
          <Text style={styles.invoicesBannerTitle}>Faturalarım</Text>
          <Text style={styles.invoicesBannerSub}>Teslim edilen sipariş faturaları</Text>
        </View>
        <ChevronRight color={t.inkMuted} size={20} />
      </Pressable>

      <Text style={styles.sectionTitle}>Teslimat türü</Text>
      <View style={styles.serviceGridWrap}>
        <HomeDeliveryTypeCarousel
          onSelectType={(type) => router.push({ pathname: '/(tabs)/create', params: { type } })}
        />
      </View>

      <Text style={styles.sectionTitle}>Aktif teslimatlar</Text>
      <GlassCard style={styles.activeCard}>
        {actives.length > 0 ? (
          actives.map((active, i) => {
            const ActiveIcon = statusIconFor(active.status);
            const tone = deliveryStatusTone(active.status);
            return (
              <Pressable
                key={active.id}
                onPress={() => router.push(`/order/${active.orderNumber}`)}
                style={[styles.activeInner, i > 0 && styles.activeRowSep]}
              >
                <View style={[styles.activeIconWrap, { backgroundColor: tone.bg }]}>
                  <ActiveIcon color={tone.fg} size={28} strokeWidth={2.2} />
                </View>
                <View style={styles.activeBody}>
                  <Text style={styles.activeNo}>#{active.orderNumber}</Text>
                  <Text style={styles.activeStatus}>{deliveryStatusLabel(active.status)}</Text>
                  <Text style={styles.activeRoute} numberOfLines={1}>
                    {deliveryRouteSummary(active.pickupAddress, active.dropoffAddress)}
                  </Text>
                </View>
                <ChevronRight color={t.inkMuted} size={22} />
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyActive}>
            <MapPinned color={t.inkSoft} size={40} strokeWidth={1.8} />
            <Text style={styles.emptyActiveText}>Şu an devam eden teslimat yok.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/create')}>
              <PlusCircle color={t.onBrand} size={18} />
              <Text style={styles.emptyBtnTxt}>İlk teslimatı oluştur</Text>
            </Pressable>
          </View>
        )}
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  content: { paddingTop: 14, paddingBottom: 36 },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  invoicesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: t.radiusLg,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(22, 178, 75, 0.18)',
    ...t.shadowTight,
  },
  invoicesBannerText: { flex: 1 },
  invoicesBannerTitle: { fontSize: 15, fontWeight: '700', color: t.ink },
  invoicesBannerSub: { fontSize: 12, color: t.inkMuted, marginTop: 2 },
  quickCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: t.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    ...t.shadowTight,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.985 }] },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickTitle: { fontSize: 15, fontWeight: '700', color: t.ink, letterSpacing: -0.2 },
  quickSub: { fontSize: 12, fontWeight: '500', color: t.inkMuted, marginTop: 5, lineHeight: 17 },
  serviceGridWrap: { paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: t.inkSecondary,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  activeCard: { marginHorizontal: 16 },
  activeInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  activeRowSep: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.border,
  },
  activeIconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  activeBody: { flex: 1 },
  activeNo: { fontSize: 12, fontWeight: '700', color: t.inkMuted },
  activeStatus: { fontSize: 17, fontWeight: '700', color: t.brand, marginTop: 2, letterSpacing: -0.2 },
  activeRoute: { fontSize: 14, color: t.inkSecondary, marginTop: 4 },
  emptyActive: { alignItems: 'center', paddingVertical: 12 },
  emptyActiveText: { marginTop: 10, fontSize: 14, color: t.inkMuted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.brand,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 999,
    ...t.shadowTight,
  },
  emptyBtnTxt: { color: t.onBrand, fontWeight: '700', fontSize: 14, letterSpacing: 0.15 },
});
