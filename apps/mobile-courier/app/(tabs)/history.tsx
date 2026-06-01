import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, ClipboardList } from 'lucide-react-native';
import { fetchCourierHistory, type CourierMeHistoryRow } from '../../lib/courier-me';
import {
  DEFAULT_HISTORY_PERIOD,
  HISTORY_PERIOD_LABELS,
  HISTORY_PERIODS,
  type HistoryPeriod,
} from '../../lib/history-period';
import { courierTheme as t } from '../../lib/theme';

function formatHistoryWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: '—', time: '' };
  }
  return {
    date: d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function HistoryTab() {
  const router = useRouter();
  const visitedRef = useRef(false);
  const periodRef = useRef<HistoryPeriod>(DEFAULT_HISTORY_PERIOD);
  const [period, setPeriod] = useState<HistoryPeriod>(DEFAULT_HISTORY_PERIOD);
  const [items, setItems] = useState<CourierMeHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (kind: 'initial' | 'pull' | 'refocus', activePeriod: HistoryPeriod) => {
      if (kind === 'initial') setLoading(true);
      if (kind === 'pull') setRefreshing(true);
      setErr(null);
      try {
        const data = await fetchCourierHistory(activePeriod);
        setItems(data.items ?? []);
      } catch (e) {
        setErr((e as Error).message);
        if (kind === 'initial') setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const k = visitedRef.current ? 'refocus' : 'initial';
      visitedRef.current = true;
      void load(k, periodRef.current);
    }, [load]),
  );

  const onSelectPeriod = useCallback(
    (next: HistoryPeriod) => {
      if (next === periodRef.current) return;
      periodRef.current = next;
      setPeriod(next);
      void load('initial', next);
    },
    [load],
  );

  const showEmpty = !loading && !err && items.length === 0;
  const showList = items.length > 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {HISTORY_PERIODS.map((key) => {
          const active = key === period;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onSelectPeriod(key)}
            >
              <Text style={[styles.filterChipTxt, active && styles.filterChipTxtActive]}>
                {HISTORY_PERIOD_LABELS[key]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={t.brand} style={styles.loader} />
      ) : null}

      {err ? (
        <View style={styles.errBox}>
          <Text style={styles.err}>{err}</Text>
          <Pressable style={styles.retry} onPress={() => void load('initial', period)}>
            <Text style={styles.retryTxt}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.empty}>
          <ClipboardList color={t.inkSoft} size={32} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Bu dönemde kayıt yok</Text>
          <Text style={styles.emptyTxt}>
            {HISTORY_PERIOD_LABELS[period]} içinde tamamlanan teslimat bulunmuyor.
          </Text>
        </View>
      ) : null}

      {showList ? (
        <View style={styles.listShell}>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('pull', period)}
                tintColor={t.brand}
                colors={[t.brand]}
              />
            }
            renderItem={({ item, index }) => {
              const { date, time } = formatHistoryWhen(item.updatedAt);
              const isLast = index === items.length - 1;

              return (
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.row,
                    !isLast && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => router.push(`/delivery/${item.orderNumber}`)}
                >
                  <Text style={styles.order} numberOfLines={1}>
                    #{item.orderNumber}
                  </Text>
                  <View style={styles.whenCol}>
                    <Text style={styles.whenDate} numberOfLines={1}>
                      {date}
                    </Text>
                    {time ? (
                      <Text style={styles.whenTime} numberOfLines={1}>
                        {time}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight color={t.inkSoft} size={18} style={styles.chevron} />
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const ROW_HEIGHT = 56;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: t.bg,
  },
  filterScroll: {
    flexGrow: 0,
    marginTop: 0,
    marginHorizontal: -16,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
  },
  filterChipActive: {
    backgroundColor: t.brandMuted,
    borderColor: t.brandBorder,
  },
  filterChipTxt: {
    color: t.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTxtActive: {
    color: t.brand,
    fontWeight: '800',
  },
  loader: { marginTop: 24 },
  errBox: { marginTop: 12 },
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
    marginTop: 8,
  },
  emptyTitle: { color: t.ink, fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyTxt: { color: t.inkMuted, fontSize: 14, marginTop: 4, textAlign: 'center' },
  listShell: {
    flex: 1,
    marginTop: 12,
    borderRadius: t.radiusMd,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    overflow: 'hidden',
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_HEIGHT,
    paddingLeft: 16,
    paddingRight: 12,
    backgroundColor: t.surface,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  rowPressed: { backgroundColor: t.surfaceMuted },
  order: {
    width: 88,
    color: t.ink,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  whenCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 6,
    minWidth: 0,
  },
  whenDate: {
    color: t.inkSecondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  whenTime: {
    color: t.inkMuted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 1,
  },
  chevron: {
    flexShrink: 0,
    marginLeft: 2,
  },
});
