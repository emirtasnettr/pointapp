import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import {
  Bike,
  ChevronRight,
  Eye,
  Inbox,
  MapPin,
  MapPinned,
} from 'lucide-react-native';
import { CourierEarningAmount } from '../../components/CourierEarningAmount';
import { fetchCourierMe } from '../../lib/courier-me';
import { statusLabelsTr } from '../../lib/courier-delivery';
import { deliveryRouteLine, formatPackageWeightKg } from '../../lib/delivery-list-helpers';
import { deliveryTypeMeta } from '../../lib/delivery-type-label';
import { courierTheme as t } from '../../lib/theme';

type Delivery = {
  id: string;
  orderNumber: number;
  status: string;
  type?: string;
  weightKg?: string | null;
  courierEarning?: string;
  pickupAddress?: unknown;
  dropoffAddress?: unknown;
  customer: { publicId: string; displayName?: string };
  description: string | null;
  courier?: { publicId: string; displayName?: string } | null;
};

const activeStatusTr: Record<string, string> = {
  COURIER_ASSIGNED: 'Atandı',
  COURIER_EN_ROUTE: 'Yolda',
  PACKAGE_PICKED_UP: 'Paket alındı',
};

function statusLabel(status: string) {
  return activeStatusTr[status] ?? statusLabelsTr[status] ?? status;
}

function statusChipStyle(status: string) {
  switch (status) {
    case 'COURIER_ASSIGNED':
      return { bg: t.brandMuted, text: '#166534' };
    case 'COURIER_EN_ROUTE':
      return { bg: 'rgba(217, 119, 6, 0.12)', text: '#b45309' };
    case 'PACKAGE_PICKED_UP':
      return { bg: 'rgba(21, 128, 61, 0.1)', text: t.success };
    default:
      return { bg: t.surfaceMuted, text: t.inkSecondary };
  }
}

export default function ActiveTab() {
  const visitedRef = useRef(false);
  const [items, setItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (kind: 'initial' | 'pull' | 'refocus') => {
    if (kind === 'initial') setLoading(true);
    if (kind === 'pull') setRefreshing(true);
    setErr(null);
    try {
      const data = await fetchCourierMe();
      setItems(data.myActive ?? []);
    } catch (e) {
      setErr((e as Error).message);
      if (kind === 'initial') setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const k = visitedRef.current ? 'refocus' : 'initial';
      visitedRef.current = true;
      void load(k);
    }, [load]),
  );

  return (
    <View style={styles.box}>
      {loading && items.length === 0 ? (
        <ActivityIndicator color={t.brand} style={styles.loader} />
      ) : null}

      {err ? (
        <View style={styles.errBox}>
          <Text style={styles.err}>{err}</Text>
          <Pressable style={styles.retry} onPress={() => void load('initial')}>
            <Text style={styles.retryTxt}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load('pull')}
            tintColor={t.brand}
            colors={[t.brand]}
          />
        }
        ListEmptyComponent={
          !loading && !err ? (
            <View style={styles.empty}>
              <Bike color={t.inkSoft} size={32} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Aktif paket yok</Text>
              <Text style={styles.emptyTxt}>Havuzdan bir iş üstlenince burada görünür.</Text>
              <Link href="/(tabs)/pool" asChild>
                <Pressable style={styles.emptyCta}>
                  <Inbox color={t.brand} size={16} />
                  <Text style={styles.emptyCtaTxt}>İş havuzuna git</Text>
                  <ChevronRight color={t.brand} size={16} />
                </Pressable>
              </Link>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const chip = statusChipStyle(item.status);
          const pickup = deliveryRouteLine(item.pickupAddress);
          const dropoff = deliveryRouteLine(item.dropoffAddress);
          const typeMeta = item.type ? deliveryTypeMeta(item.type) : null;
          const TypeIcon = typeMeta?.Icon;
          const weightLabel =
            item.type === 'PACKAGE' ? formatPackageWeightKg(item.weightKg) : null;
          const note =
            item.description?.trim() ||
            item.customer.displayName?.trim() ||
            item.customer.publicId;
          const hasRoute = pickup !== '—' || dropoff !== '—';

          return (
            <Link href={`/delivery/${item.orderNumber}`} asChild>
              <Pressable style={styles.card}>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.order}>#{item.orderNumber}</Text>
                      <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
                        <Text style={[styles.statusChipTxt, { color: chip.text }]}>
                          {statusLabel(item.status)}
                        </Text>
                      </View>
                      {typeMeta && TypeIcon ? (
                        <View style={styles.typeChip}>
                          <TypeIcon color={t.brand} size={11} strokeWidth={2.4} />
                          <Text style={styles.typeChipTxt}>
                            {typeMeta.label}
                            {weightLabel ? ` · ${weightLabel}` : ''}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <CourierEarningAmount value={item.courierEarning} variant="card" />
                  </View>

                  {note ? (
                    <Text style={styles.note} numberOfLines={1}>
                      {note}
                    </Text>
                  ) : null}

                  {hasRoute ? (
                    <View style={styles.routeList}>
                      <View style={styles.routeLine}>
                        <MapPin color={t.brand} size={13} strokeWidth={2.4} />
                        <Text style={styles.routeLbl}>Alış</Text>
                        <Text style={styles.routeTxt} numberOfLines={1}>
                          {pickup}
                        </Text>
                      </View>
                      <View style={styles.routeLine}>
                        <MapPinned color="#b45309" size={13} strokeWidth={2.4} />
                        <Text style={styles.routeLbl}>Varış</Text>
                        <Text style={styles.routeTxt} numberOfLines={1}>
                          {dropoff}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={styles.viewFoot}>
                  <Eye color={t.brand} size={15} strokeWidth={2.4} />
                  <Text style={styles.viewTxt}>Görüntüle</Text>
                  <ChevronRight color={t.inkSoft} size={16} />
                </View>
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, paddingHorizontal: 16, paddingTop: 12, backgroundColor: t.bg },
  loader: { marginTop: 20 },
  listContent: { paddingTop: 4, paddingBottom: 88, flexGrow: 1 },
  errBox: { marginTop: 10 },
  err: { color: t.danger, fontSize: 14, lineHeight: 20 },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: t.radiusSm,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
  },
  retryTxt: { color: t.brand, fontWeight: '700', fontSize: 14 },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: { color: t.ink, fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyTxt: { color: t.inkMuted, fontSize: 14, marginTop: 4, textAlign: 'center' },
  emptyCta: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: t.radiusMd,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  emptyCtaTxt: { color: t.brand, fontWeight: '700', fontSize: 14 },
  card: {
    marginBottom: 8,
    borderRadius: t.radiusMd,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
    ...t.shadow,
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  order: { color: t.ink, fontSize: 15, fontWeight: '800' },
  statusChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusChipTxt: { fontSize: 10, fontWeight: '800' },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: t.brandMuted,
  },
  typeChipTxt: { color: t.brand, fontSize: 10, fontWeight: '800' },
  earn: { color: t.brand, fontSize: 15, fontWeight: '800', flexShrink: 0 },
  earnCur: { fontSize: 13, fontWeight: '700' },
  note: {
    color: t.inkSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  routeList: {
    marginTop: 8,
    gap: 5,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  routeLbl: {
    color: t.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    width: 36,
  },
  routeTxt: {
    flex: 1,
    color: t.ink,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  viewFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.surfaceMuted,
  },
  viewTxt: { color: t.brand, fontWeight: '700', fontSize: 13 },
});
