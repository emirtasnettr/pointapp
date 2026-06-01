import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarRange, ChevronRight, PackageSearch, X } from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';
import { apiGetAuth } from '../../lib/api';
import { deliveryStatusLabel, deliveryStatusTone } from '../../lib/delivery-status';
import { statusIconFor } from '../../lib/delivery-icons';
import { DeliveryInvoiceBadge } from '../../lib/delivery-invoice-badge';
import { deliveryRouteSummary } from '../../lib/address-route';
import {
  addCalendarDaysIstanbul,
  formatYmdIstanbul,
  istanbulYmdToUtcBounds,
  noonDateUtcPlus3FromYmd,
} from '../../lib/istanbul-calendar';
import { customerTheme as t } from '../../lib/theme';

type Row = {
  id: string;
  orderNumber: number;
  status: string;
  customerInvoiceCount?: number;
  pickupAddress?: { label?: string; line1?: string; city?: string };
  dropoffAddress?: { label?: string; line1?: string; city?: string };
};

function formatYmdDisplayTr(ymd: string) {
  return noonDateUtcPlus3FromYmd(ymd).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function spanDaysInclusive(fromYmd: string, toYmd: string): number {
  const a = istanbulYmdToUtcBounds(fromYmd).gte.getTime();
  const b = istanbulYmdToUtcBounds(toYmd).lte.getTime();
  return Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

function defaultWeekRange(): { from: string; to: string } {
  const to = formatYmdIstanbul();
  return { from: addCalendarDaysIstanbul(to, -6), to };
}

export default function OrdersTab() {
  const router = useRouter();
  const [range, setRange] = useState(defaultWeekRange);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(() => noonDateUtcPlus3FromYmd(defaultWeekRange().from));
  const [draftTo, setDraftTo] = useState(() => noonDateUtcPlus3FromYmd(defaultWeekRange().to));
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);
  const [filterErr, setFilterErr] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async (from: string, to: string) => {
    setErr(null);
    const qs = new URLSearchParams({ take: '80', fromDate: from, toDate: to });
    const data = await apiGetAuth<{ items: Row[] }>(`/customer/deliveries?${qs.toString()}`);
    setItems(data.items ?? []);
  }, []);

  const load = useCallback(async () => {
    try {
      await fetchDeliveries(range.from, range.to);
    } catch (e) {
      setErr((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchDeliveries, range.from, range.to]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const openFilter = () => {
    setFilterErr(null);
    setDraftFrom(noonDateUtcPlus3FromYmd(range.from));
    setDraftTo(noonDateUtcPlus3FromYmd(range.to));
    setActivePicker(null);
    setFilterOpen(true);
  };

  const applyPresetWeek = () => {
    const w = defaultWeekRange();
    setDraftFrom(noonDateUtcPlus3FromYmd(w.from));
    setDraftTo(noonDateUtcPlus3FromYmd(w.to));
    setActivePicker(null);
    setFilterErr(null);
  };

  const applyFilter = () => {
    let from = formatYmdIstanbul(draftFrom);
    let to = formatYmdIstanbul(draftTo);
    if (from > to) {
      const s = from;
      from = to;
      to = s;
    }
    const days = spanDaysInclusive(from, to);
    if (days > 366) {
      setFilterErr('En fazla 366 günlük aralık seçebilirsiniz.');
      return;
    }
    setRange({ from, to });
    setFilterOpen(false);
    setActivePicker(null);
    setLoading(true);
    void (async () => {
      try {
        await fetchDeliveries(from, to);
      } catch (e) {
        setErr((e as Error).message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  };

  const onPickerChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }
    if (!selected) return;
    if (activePicker === 'from') setDraftFrom(selected);
    if (activePicker === 'to') setDraftTo(selected);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {err ? (
        <GlassCard style={styles.errBanner}>
          <Text style={styles.errTxt}>{err}</Text>
        </GlassCard>
      ) : null}

      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterOpen(false)} accessibilityRole="button" />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tarih aralığı</Text>
              <Pressable onPress={() => setFilterOpen(false)} hitSlop={12} accessibilityLabel="Kapat">
                <X color={t.inkMuted} size={22} strokeWidth={2.2} />
              </Pressable>
            </View>
            <Text style={styles.modalHint}>Tarihler Türkiye (İstanbul) takvimine göredir.</Text>
            <Pressable style={styles.presetBtn} onPress={applyPresetWeek}>
              <Text style={styles.presetBtnTxt}>Son 7 gün (bugün dahil)</Text>
            </Pressable>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Başlangıç</Text>
              <Text style={styles.dateValue}>{formatYmdDisplayTr(formatYmdIstanbul(draftFrom))}</Text>
              <Pressable style={styles.dateEdit} onPress={() => setActivePicker(activePicker === 'from' ? null : 'from')}>
                <Text style={styles.dateEditTxt}>Seç</Text>
              </Pressable>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Bitiş</Text>
              <Text style={styles.dateValue}>{formatYmdDisplayTr(formatYmdIstanbul(draftTo))}</Text>
              <Pressable style={styles.dateEdit} onPress={() => setActivePicker(activePicker === 'to' ? null : 'to')}>
                <Text style={styles.dateEditTxt}>Seç</Text>
              </Pressable>
            </View>
            {activePicker ? (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={activePicker === 'from' ? draftFrom : draftTo}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onPickerChange}
                  themeVariant="light"
                />
                {Platform.OS === 'ios' ? (
                  <Pressable style={styles.pickerDone} onPress={() => setActivePicker(null)}>
                    <Text style={styles.pickerDoneTxt}>Tamam</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {filterErr ? <Text style={styles.filterErr}>{filterErr}</Text> : null}
            <Pressable style={styles.applyBtn} onPress={applyFilter}>
              <Text style={styles.applyBtnTxt}>Uygula</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={t.brand}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Pressable style={styles.filterChip} onPress={openFilter}>
              <CalendarRange size={16} color={t.brand} strokeWidth={2.2} />
              <Text style={styles.filterChipTxt} numberOfLines={1}>
                {formatYmdDisplayTr(range.from)} — {formatYmdDisplayTr(range.to)}
              </Text>
            </Pressable>
            {items.length > 0 ? (
              <Text style={styles.listHeaderCount}>{items.length} kayıt</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <PackageSearch color={t.inkSoft} size={48} strokeWidth={1.6} />
            </View>
            <Text style={styles.emptyTitle}>Teslimat bulunamadı</Text>
            <Text style={styles.emptySub}>
              Seçilen tarihler arasında kayıt yok. Aralığı genişletmek için tarih filtresine dokunun.
            </Text>
            <Pressable style={styles.emptyCta} onPress={openFilter}>
              <Text style={styles.emptyCtaTxt}>Tarih aralığını değiştir</Text>
            </Pressable>
            <Pressable style={styles.emptyCtaSecondary} onPress={() => router.push('/(tabs)/create')}>
              <Text style={styles.emptyCtaSecondaryTxt}>Yeni teslimat oluştur</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const Icon = statusIconFor(item.status);
          const tone = deliveryStatusTone(item.status);
          const route = deliveryRouteSummary(item.pickupAddress, item.dropoffAddress);
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push(`/order/${item.orderNumber}`)}
            >
              <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
                <Icon color={tone.fg} size={22} strokeWidth={2.2} />
              </View>
              <View style={styles.mid}>
                <Text style={styles.no}>#{item.orderNumber}</Text>
                <Text style={styles.route} numberOfLines={2}>
                  {route}
                </Text>
                <View style={styles.badge}>
                  <Text style={[styles.badgeTxt, { color: tone.fg }]}>{deliveryStatusLabel(item.status)}</Text>
                </View>
                <View style={styles.invoiceBadgeWrap}>
                  <DeliveryInvoiceBadge
                    status={item.status}
                    customerInvoiceCount={item.customerInvoiceCount}
                  />
                </View>
              </View>
              <ChevronRight color={t.inkSoft} size={22} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  listHeader: { marginBottom: 12, marginTop: 4, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(22, 178, 75, 0.22)',
  },
  filterChipTxt: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: t.ink },
  listHeaderCount: { fontSize: 12, fontWeight: '600', color: t.inkSecondary },
  emptyList: { flexGrow: 1 },
  errBanner: { margin: 16, borderColor: 'rgba(220,38,38,0.35)', backgroundColor: t.dangerBg },
  errTxt: { color: t.danger, fontSize: 14, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: t.ink, letterSpacing: -0.3 },
  modalHint: { fontSize: 12, color: t.inkMuted, marginBottom: 14, lineHeight: 17 },
  presetBtn: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: t.brandMuted,
    marginBottom: 16,
  },
  presetBtnTxt: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: t.brand },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  dateLabel: { width: 88, fontSize: 13, fontWeight: '600', color: t.inkSecondary },
  dateValue: { flex: 1, fontSize: 14, fontWeight: '600', color: t.ink },
  dateEdit: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(26,34,48,0.06)' },
  dateEditTxt: { fontSize: 13, fontWeight: '700', color: t.brand },
  pickerWrap: { marginTop: 4, marginBottom: 8 },
  pickerDone: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: t.brand,
  },
  pickerDoneTxt: { color: t.onBrand, fontWeight: '700', fontSize: 14 },
  filterErr: { color: t.danger, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  applyBtn: {
    marginTop: 8,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: t.brand,
    ...t.shadowTight,
  },
  applyBtnTxt: { textAlign: 'center', color: t.onBrand, fontWeight: '800', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: t.radiusLg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.88)',
    ...t.shadowTight,
  },
  pressed: { opacity: 0.94 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  mid: { flex: 1 },
  no: { fontSize: 12, fontWeight: '700', color: t.inkMuted, letterSpacing: 0.3 },
  route: { fontSize: 15, fontWeight: '600', color: t.ink, marginTop: 4, lineHeight: 21, letterSpacing: -0.15 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(26, 34, 48, 0.05)',
  },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  invoiceBadgeWrap: { marginTop: 6 },
  emptyWrap: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 48, alignItems: 'center' },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    ...t.shadowTight,
  },
  emptyTitle: { marginTop: 20, fontSize: 19, fontWeight: '800', color: t.ink, letterSpacing: -0.35 },
  emptySub: { marginTop: 8, fontSize: 14, color: t.inkMuted, textAlign: 'center', lineHeight: 20 },
  emptyCta: { marginTop: 20, backgroundColor: t.brand, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999, ...t.shadowTight },
  emptyCtaTxt: { color: t.onBrand, fontWeight: '800', fontSize: 14 },
  emptyCtaSecondary: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 12 },
  emptyCtaSecondaryTxt: { color: t.brand, fontWeight: '700', fontSize: 14 },
});
