import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { CourierMe } from '../../lib/courier-me';
import { fetchCourierMe } from '../../lib/courier-me';
import { COURIER_EARNING_VAT_NOTE, formatDeliveryEarning } from '../../lib/delivery-list-helpers';
import { fetchCourierPayoutRequests, type CourierPayoutItem } from '../../lib/courier-payout';
import { courierTheme as t } from '../../lib/theme';

const ledgerTr: Record<string, string> = {
  DELIVERY_EARNING: 'Teslimat kazancı',
  COMMISSION_DEDUCTION: 'Komisyon',
  PAYOUT: 'Ödeme',
  ADJUSTMENT: 'Düzeltme',
};

const payoutStatusTr: Record<string, string> = {
  PENDING: 'Beklemede',
  APPROVED: 'Onaylandı',
  PAID: 'Ödendi',
  REJECTED: 'Reddedildi',
};

function payoutStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
      return t.success;
    case 'REJECTED':
      return t.danger;
    case 'APPROVED':
      return t.brand;
    default:
      return t.inkMuted;
  }
}

function formatWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
  return {
    date: d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function EarningsTab() {
  const router = useRouter();
  const visitedRef = useRef(false);
  const [data, setData] = useState<CourierMe | null>(null);
  const [payouts, setPayouts] = useState<CourierPayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (kind: 'initial' | 'pull' | 'refocus') => {
    if (kind === 'initial') setLoading(true);
    if (kind === 'pull') setRefreshing(true);
    setErr(null);
    try {
      const [me, pr] = await Promise.all([fetchCourierMe(), fetchCourierPayoutRequests()]);
      setData(me);
      setPayouts(pr.items);
    } catch (e) {
      setErr((e as Error).message);
      if (kind === 'initial') {
        setData(null);
        setPayouts([]);
      }
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

  const latestOpen = payouts.find((p) => p.status === 'PENDING' || p.status === 'APPROVED');
  const blockNewPayout = Boolean(latestOpen);
  const blockNoDelivered = data ? data.delivered.count < 1 : false;
  const canRequestPayout = !blockNewPayout && !blockNoDelivered;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load('pull')}
          tintColor={t.brand}
          colors={[t.brand]}
        />
      }
    >
      {loading && !data ? <ActivityIndicator color={t.brand} style={styles.loader} /> : null}

      {err ? (
        <View style={styles.errBox}>
          <Text style={styles.err}>{err}</Text>
          <Pressable style={styles.retry} onPress={() => void load('initial')}>
            <Text style={styles.retryTxt}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : null}

      {data?.wallet ? (
        <View style={styles.summaryPanel}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLbl}>Bakiye ({COURIER_EARNING_VAT_NOTE})</Text>
            <Text style={styles.summaryVal}>
              {formatDeliveryEarning(data.wallet.balance)} {data.wallet.currency}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLbl}>Bekleyen ({COURIER_EARNING_VAT_NOTE})</Text>
              <Text style={styles.summaryHint}>Aktif teslimatlarınızın kazancı</Text>
            </View>
            <Text style={styles.summaryValMuted}>
              {formatDeliveryEarning(data.wallet.pending)} {data.wallet.currency}
            </Text>
          </View>
        </View>
      ) : null}

      {latestOpen ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>Aktif ödeme talebi</Text>
          <Text style={styles.infoBannerTxt}>
            {formatDeliveryEarning(latestOpen.amount)} ₺ ·{' '}
            <Text style={{ color: payoutStatusColor(latestOpen.status), fontWeight: '700' }}>
              {payoutStatusTr[latestOpen.status] ?? latestOpen.status}
            </Text>
          </Text>
        </View>
      ) : null}

      {blockNoDelivered && !latestOpen ? (
        <View style={styles.warnBanner}>
          <Text style={styles.warnBannerTxt}>
            Ödeme talebi için en az bir teslimat tamamlamalısınız.
          </Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.payoutBtn, !canRequestPayout && styles.payoutBtnDisabled]}
        onPress={() => {
          if (!canRequestPayout) return;
          router.push('/payout-request');
        }}
        disabled={!canRequestPayout}
      >
        <Text style={[styles.payoutBtnTxt, !canRequestPayout && styles.payoutBtnTxtDisabled]}>
          Ödeme Talebi Oluştur
        </Text>
        {canRequestPayout ? <ChevronRight color={t.brand} size={20} /> : null}
      </Pressable>

      {payouts.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Ödeme talepleri</Text>
          <View style={styles.listPanel}>
            {payouts.map((p, index) => {
              const { date, time } = formatWhen(p.createdAt);
              const isLast = index === payouts.length - 1;
              return (
                <View key={p.id} style={[styles.listRow, !isLast && styles.listRowBorder]}>
                  <View style={styles.listMain}>
                    <Text style={styles.listPrimary}>{formatDeliveryEarning(p.amount)} ₺</Text>
                    <Text style={[styles.listBadge, { color: payoutStatusColor(p.status) }]}>
                      {payoutStatusTr[p.status] ?? p.status}
                    </Text>
                  </View>
                  <Text style={styles.listMeta}>
                    {date}
                    {time ? ` · ${time}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {data?.ledger && data.ledger.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Hareketler</Text>
          <View style={styles.listPanel}>
            {data.ledger.map((e, index) => {
              const { date, time } = formatWhen(e.createdAt);
              const isLast = index === data.ledger.length - 1;
              const n = Number(e.amount);
              const positive = !Number.isNaN(n) && n >= 0;
              return (
                <View key={e.id} style={[styles.listRow, !isLast && styles.listRowBorder]}>
                  <View style={styles.listMain}>
                    <Text style={styles.listPrimary}>{ledgerTr[e.type] ?? e.type}</Text>
                    <Text style={[styles.listAmt, positive ? styles.amtPos : styles.amtNeg]}>
                      {positive && n > 0 ? '+' : ''}
                      {formatDeliveryEarning(e.amount)} ₺
                    </Text>
                  </View>
                  <Text style={styles.listMeta}>
                    {date}
                    {time ? ` · ${time}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {!loading && !err && !payouts.length && (!data?.ledger || data.ledger.length === 0) ? (
        <Text style={styles.emptyTxt}>Henüz hareket veya ödeme talebi yok.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 88 },
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
  summaryPanel: {
    marginTop: 12,
    borderRadius: t.radiusMd,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...t.shadow,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  summaryLbl: { color: t.inkMuted, fontSize: 14, fontWeight: '600' },
  summaryHint: { color: t.inkMuted, fontSize: 11, marginTop: 2 },
  summaryVal: { color: t.brand, fontSize: 18, fontWeight: '800' },
  summaryValMuted: { color: t.inkSecondary, fontSize: 15, fontWeight: '700' },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.border,
  },
  infoBanner: {
    marginTop: 10,
    padding: 12,
    borderRadius: t.radiusMd,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  infoBannerTitle: {
    color: t.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoBannerTxt: { color: t.ink, fontSize: 14, fontWeight: '600', marginTop: 4 },
  warnBanner: {
    marginTop: 10,
    padding: 12,
    borderRadius: t.radiusMd,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  warnBannerTxt: { color: t.warn, fontSize: 13, lineHeight: 18 },
  payoutBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: t.radiusMd,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  payoutBtnDisabled: {
    opacity: 0.55,
    borderColor: t.border,
  },
  payoutBtnTxt: { color: t.brand, fontSize: 15, fontWeight: '800' },
  payoutBtnTxtDisabled: { color: t.inkMuted },
  sectionTitle: {
    color: t.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 20,
    marginBottom: 8,
  },
  listPanel: {
    borderRadius: t.radiusMd,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    overflow: 'hidden',
  },
  listRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  listMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  listPrimary: { color: t.ink, fontSize: 15, fontWeight: '700', flex: 1 },
  listBadge: { fontSize: 12, fontWeight: '800' },
  listAmt: { fontSize: 15, fontWeight: '800' },
  amtPos: { color: t.success },
  amtNeg: { color: t.danger },
  listMeta: { color: t.inkMuted, fontSize: 12, marginTop: 4 },
  emptyTxt: { color: t.inkMuted, fontSize: 14, marginTop: 16, textAlign: 'center' },
});
