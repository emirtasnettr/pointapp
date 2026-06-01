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
import { CalendarRange, ChevronRight, FileText, X } from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';
import { DeliveryInvoiceBadge } from '../../lib/delivery-invoice-badge';
import { apiGetAuth } from '../../lib/api';
import { openCustomerDeliveryInvoice } from '../../lib/open-customer-invoice';
import { formatTry } from '../../lib/delivery-display';
import {
  addCalendarDaysIstanbul,
  formatYmdIstanbul,
  noonDateUtcPlus3FromYmd,
} from '../../lib/istanbul-calendar';
import { customerTheme as t } from '../../lib/theme';

type OverviewResponse = {
  pending: Array<{
    deliveryId: string;
    orderNumber: number;
    totalPrice: string;
    deliveredAt: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    fileName: string;
    createdAt: string;
    orderNumbers: number[];
    deliveryCount: number;
  }>;
};

type ListItem =
  | { kind: 'pending'; key: string; orderNumber: number; totalPrice: string; deliveredAt: string }
  | { kind: 'invoice'; key: string; id: string; title: string; sub: string };

function formatYmdDisplayTr(ymd: string) {
  return noonDateUtcPlus3FromYmd(ymd).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function defaultRange() {
  const to = formatYmdIstanbul();
  return { from: addCalendarDaysIstanbul(to, -89), to };
}

export default function InvoicesTab() {
  const router = useRouter();
  const [range, setRange] = useState(defaultRange);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(() => noonDateUtcPlus3FromYmd(defaultRange().from));
  const [draftTo, setDraftTo] = useState(() => noonDateUtcPlus3FromYmd(defaultRange().to));
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);

  const fetchOverview = useCallback(async (from: string, to: string) => {
    const qs = new URLSearchParams({ fromDate: from, toDate: to, take: '100' });
    return apiGetAuth<OverviewResponse>(`/customer/invoices?${qs.toString()}`);
  }, []);

  const load = useCallback(async () => {
    try {
      setErr(null);
      const data = await fetchOverview(range.from, range.to);
      setOverview(data);
    } catch (e) {
      setErr((e as Error).message);
      setOverview(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchOverview, range.from, range.to]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const listItems: ListItem[] = [];
  for (const p of overview?.pending ?? []) {
    listItems.push({
      kind: 'pending',
      key: `p-${p.deliveryId}`,
      orderNumber: p.orderNumber,
      totalPrice: p.totalPrice,
      deliveredAt: p.deliveredAt,
    });
  }
  for (const inv of overview?.invoices ?? []) {
    const orders =
      inv.deliveryCount > 1
        ? `#${inv.orderNumbers.join(', #')}`
        : inv.orderNumbers[0]
          ? `#${inv.orderNumbers[0]}`
          : '';
    listItems.push({
      kind: 'invoice',
      key: `i-${inv.id}`,
      id: inv.id,
      title: inv.invoiceNumber || inv.fileName,
      sub: `${new Date(inv.createdAt).toLocaleString('tr-TR')}${orders ? ` · ${orders}` : ''}`,
    });
  }

  const openInvoice = async (id: string) => {
    setOpeningId(id);
    try {
      await openCustomerDeliveryInvoice(id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setOpeningId(null);
    }
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
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tarih aralığı</Text>
              <Pressable onPress={() => setFilterOpen(false)} hitSlop={12}>
                <X color={t.inkMuted} size={22} />
              </Pressable>
            </View>
            <Pressable
              style={styles.presetBtn}
              onPress={() => {
                const r = defaultRange();
                setDraftFrom(noonDateUtcPlus3FromYmd(r.from));
                setDraftTo(noonDateUtcPlus3FromYmd(r.to));
              }}
            >
              <Text style={styles.presetBtnTxt}>Son 90 gün</Text>
            </Pressable>
            <Pressable style={styles.dateEdit} onPress={() => setActivePicker('from')}>
              <Text style={styles.dateEditTxt}>Başlangıç: {formatYmdDisplayTr(formatYmdIstanbul(draftFrom))}</Text>
            </Pressable>
            <Pressable style={styles.dateEdit} onPress={() => setActivePicker('to')}>
              <Text style={styles.dateEditTxt}>Bitiş: {formatYmdDisplayTr(formatYmdIstanbul(draftTo))}</Text>
            </Pressable>
            {activePicker ? (
              <DateTimePicker
                value={activePicker === 'from' ? draftFrom : draftTo}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (Platform.OS === 'android') setActivePicker(null);
                  if (!d) return;
                  if (activePicker === 'from') setDraftFrom(d);
                  else setDraftTo(d);
                }}
              />
            ) : null}
            <Pressable
              style={styles.applyBtn}
              onPress={() => {
                let from = formatYmdIstanbul(draftFrom);
                let to = formatYmdIstanbul(draftTo);
                if (from > to) {
                  const s = from;
                  from = to;
                  to = s;
                }
                setRange({ from, to });
                setFilterOpen(false);
                setLoading(true);
                void fetchOverview(from, to)
                  .then(setOverview)
                  .catch((e) => setErr((e as Error).message))
                  .finally(() => setLoading(false));
              }}
            >
              <Text style={styles.applyBtnTxt}>Uygula</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <FlatList
        data={listItems}
        keyExtractor={(x) => x.key}
        contentContainerStyle={listItems.length === 0 ? styles.emptyList : styles.list}
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
            <Pressable style={styles.filterChip} onPress={() => setFilterOpen(true)}>
              <CalendarRange size={16} color={t.brand} strokeWidth={2.2} />
              <Text style={styles.filterChipTxt} numberOfLines={1}>
                {formatYmdDisplayTr(range.from)} — {formatYmdDisplayTr(range.to)}
              </Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <FileText color={t.inkSoft} size={48} strokeWidth={1.6} />
            <Text style={styles.emptyTitle}>Fatura kaydı yok</Text>
            <Text style={styles.emptySub}>Seçilen aralıkta teslim edilmiş sipariş veya yüklenmiş fatura bulunamadı.</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'pending') {
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => router.push(`/order/${item.orderNumber}`)}
              >
                <View style={styles.mid}>
                  <Text style={styles.no}>#{item.orderNumber}</Text>
                  <Text style={styles.sub}>
                    {formatTry(item.totalPrice)} · {new Date(item.deliveredAt).toLocaleString('tr-TR')}
                  </Text>
                  <DeliveryInvoiceBadge status="DELIVERED" customerInvoiceCount={0} />
                </View>
                <ChevronRight color={t.inkSoft} size={22} />
              </Pressable>
            );
          }
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => void openInvoice(item.id)}
              disabled={openingId === item.id}
            >
              <View style={[styles.iconWrap, { backgroundColor: t.brandMuted }]}>
                <FileText color={t.brand} size={22} strokeWidth={2.2} />
              </View>
              <View style={styles.mid}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.sub} numberOfLines={2}>
                  {item.sub}
                </Text>
                <DeliveryInvoiceBadge status="DELIVERED" customerInvoiceCount={1} />
              </View>
              <Text style={styles.openTxt}>{openingId === item.id ? '…' : 'Aç'}</Text>
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
  emptyList: { flexGrow: 1 },
  listHeader: { marginBottom: 12, marginTop: 4 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(22, 178, 75, 0.22)',
  },
  filterChipTxt: { fontSize: 12, fontWeight: '700', color: t.ink },
  errBanner: { margin: 16, borderColor: 'rgba(220,38,38,0.35)', backgroundColor: t.dangerBg },
  errTxt: { color: t.danger, fontSize: 14, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: t.ink },
  presetBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: t.brandMuted,
    marginBottom: 12,
  },
  presetBtnTxt: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: t.brand },
  dateEdit: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(26,34,48,0.06)',
    marginBottom: 8,
  },
  dateEditTxt: { fontSize: 14, fontWeight: '600', color: t.ink },
  applyBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: t.brand,
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
  no: { fontSize: 12, fontWeight: '700', color: t.inkMuted },
  title: { fontSize: 15, fontWeight: '600', color: t.ink },
  sub: { fontSize: 12, color: t.inkMuted, marginTop: 4, lineHeight: 17 },
  openTxt: { fontSize: 12, fontWeight: '700', color: t.brand },
  emptyWrap: { paddingHorizontal: 28, paddingTop: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: t.ink },
  emptySub: { fontSize: 14, color: t.inkMuted, textAlign: 'center', lineHeight: 20 },
});
