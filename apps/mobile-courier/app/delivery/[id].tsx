import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { MapPin, MapPinned, Navigation, Phone, RefreshCw } from 'lucide-react-native';
import { deliveryTypeMeta } from '../../lib/delivery-type-label';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGetAuth, apiPostAuth } from '../../lib/api';
import { courierActionPath, getNextCourierAction, statusLabelsTr } from '../../lib/courier-delivery';
import { CourierEarningAmount } from '../../components/CourierEarningAmount';
import { formatPackageWeightKg } from '../../lib/delivery-list-helpers';
import {
  addressLatLng,
  formatAddressSnapshot,
  googleMapsSearchUrl,
} from '../../lib/format-delivery-address';
import { getCourierAccessToken, getCourierPublicId } from '../../lib/session';
import { courierTheme as t } from '../../lib/theme';

const ACTOR_TR: Record<string, string> = {
  courier: 'Kurye',
  system: 'Sistem',
  staff: 'Operasyon',
  customer: 'Müşteri',
};

type StatusLog = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorType: string;
  createdAt: string;
};

type Delivery = {
  orderNumber: number;
  status: string;
  type: string;
  weightKg: string | null;
  courierEarning: string;
  description: string | null;
  notes: string | null;
  pickupAddress: Record<string, unknown>;
  dropoffAddress: Record<string, unknown>;
  senderName: string;
  recipientName: string;
  supportLinePhone: string | null;
  customer: { publicId: string; displayName?: string };
  courier: { publicId: string; displayName?: string } | null;
  statusLogs?: StatusLog[];
};

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function formatLogWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusTone(status: string): { bg: string; border: string; text: string } {
  switch (status) {
    case 'DELIVERED':
      return { bg: t.brandMuted, border: t.brandBorder, text: t.success };
    case 'CANCELLED':
      return { bg: t.dangerBg, border: 'rgba(220,38,38,0.2)', text: t.danger };
    case 'POOL':
      return { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };
    case 'COURIER_EN_ROUTE':
    case 'PACKAGE_PICKED_UP':
      return { bg: '#fff7ed', border: '#fed7aa', text: t.warn };
    default:
      return { bg: t.surfaceMuted, border: t.border, text: t.inkSecondary };
  }
}

function Block({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      {title ? <Text style={styles.blockTitle}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function RouteStop({
  title,
  personName,
  address,
  onMap,
  kind,
  isLast,
}: {
  title: string;
  personName: string;
  address: Record<string, unknown>;
  onMap: () => void;
  kind: 'pickup' | 'dropoff';
  isLast?: boolean;
}) {
  const isPickup = kind === 'pickup';
  const Icon = isPickup ? MapPin : MapPinned;
  const iconColor = isPickup ? t.brand : '#b45309';
  const hasMap = Boolean(addressLatLng(address));
  const person = personName?.trim() || '—';
  const addr = formatAddressSnapshot(address);

  return (
    <View style={[styles.stop, !isLast && styles.stopBorder]}>
      <View style={styles.stopRow}>
        <View style={[styles.stopIcon, isPickup ? styles.stopIconPickup : styles.stopIconDrop]}>
          <Icon color={iconColor} size={16} strokeWidth={2.4} />
        </View>
        <View style={styles.stopMain}>
          <View style={styles.stopHead}>
            <Text style={styles.stopTitle}>{title}</Text>
            {hasMap ? (
              <Pressable style={styles.mapLink} onPress={onMap} hitSlop={8}>
                <Navigation color={t.brand} size={14} strokeWidth={2.4} />
                <Text style={styles.mapLinkTxt}>Harita</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.stopLine} selectable>
            <Text style={styles.stopLbl}>Kişi Adı: </Text>
            <Text style={styles.stopVal}>{person}</Text>
          </Text>
          <Text style={[styles.stopLine, styles.stopLineGap]} selectable>
            <Text style={styles.stopLbl}>Adres: </Text>
            <Text style={styles.stopVal}>{addr}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [d, setD] = useState<Delivery | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPublicId, setMyPublicId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      setLoading(false);
      setErr('Geçersiz teslimat bağlantısı.');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const token = await getCourierAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const [pid, row] = await Promise.all([
        getCourierPublicId(),
        apiGetAuth<Delivery>(`/courier/deliveries/${encodeURIComponent(id)}/detail`),
      ]);
      setMyPublicId(pid);
      setD(row);
    } catch (e) {
      setErr((e as Error).message);
      setD(null);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusHistory = useMemo(() => {
    if (!d?.statusLogs?.length || d.status === 'POOL') return [];
    return [...d.statusLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [d?.status, d?.statusLogs]);
  const next = d ? getNextCourierAction(d.status, d.courier?.publicId ?? null, myPublicId) : null;
  const footerVisible = !!(next && d);

  const scrollBottomPad = useMemo(() => {
    const footerBlock = footerVisible ? 132 + Math.max(insets.bottom, 14) : 32;
    return 20 + footerBlock;
  }, [footerVisible, insets.bottom]);

  const runAction = useCallback(
    (label: string, path: string, confirm?: string) => {
      const exec = () => {
        void (async () => {
          setActing(true);
          try {
            await apiPostAuth(path);
            await load();
          } catch (ex) {
            Alert.alert('Hata', (ex as Error).message);
          } finally {
            setActing(false);
          }
        })();
      };
      if (confirm) {
        Alert.alert(label, confirm, [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Onayla', style: 'default', onPress: exec },
        ]);
      } else {
        exec();
      }
    },
    [load],
  );

  const onPrimary = useCallback(() => {
    if (!d || !next) return;
    const path = courierActionPath(next.action, d.orderNumber);
    if (next.action === 'complete') {
      runAction(next.label, path, 'Teslimi tamamlamak istediğinize emin misiniz?');
      return;
    }
    if (next.action === 'claim') {
      runAction(
        next.label,
        path,
        `#${d.orderNumber} numaralı teslimatı üstünüze almak istiyor musunuz?`,
      );
      return;
    }
    runAction(next.label, path);
  }, [d, next, runAction]);

  const foreign =
    d &&
    d.courier &&
    myPublicId &&
    d.courier.publicId !== myPublicId &&
    d.status !== 'POOL' &&
    d.status !== 'DELIVERED' &&
    d.status !== 'CANCELLED';

  const openTel = (phone: string) => {
    void Linking.openURL(telHref(phone)).catch(() => {
      Alert.alert('Arama', 'Telefon uygulaması açılamadı.');
    });
  };

  const openMap = (label: string, raw: Record<string, unknown>) => {
    const ll = addressLatLng(raw);
    if (!ll) {
      Alert.alert('Harita', 'Bu adres için konum bilgisi yok.');
      return;
    }
    void Linking.openURL(googleMapsSearchUrl(ll.lat, ll.lng)).catch(() => {
      Alert.alert('Harita', `${label} konumu açılamadı.`);
    });
  };

  const tone = d ? statusTone(d.status) : statusTone('POOL');
  const statusLabel = d ? (statusLabelsTr[d.status] ?? d.status) : '';
  const packageContents = d?.description?.trim() ?? '';
  const orderNote =
    d?.notes?.trim() ||
    (d?.type === 'DOCUMENT' ? d?.description?.trim() : '') ||
    '';
  const orderNoteDisplay = orderNote || 'Sipariş notu yok.';
  const isPackage = d?.type === 'PACKAGE';
  const typeMeta = d ? deliveryTypeMeta(d.type) : null;
  const weightLabel = isPackage ? formatPackageWeightKg(d?.weightKg) : null;
  const customerLabel = d?.customer.displayName?.trim() || d?.customer.publicId || '';

  const metaParts = [
    customerLabel,
    isPackage && typeMeta ? typeMeta.label : null,
    isPackage && weightLabel ? weightLabel : null,
  ].filter(Boolean);

  return (
    <>
      <Stack.Screen
        options={{
          title: d ? `Sipariş #${d.orderNumber}` : 'Teslimat',
          headerBackTitle: 'Geri',
          headerStyle: { backgroundColor: t.surface },
          headerTintColor: t.ink,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', color: t.ink, fontSize: 17 },
          headerRight: () => (
            <Pressable onPress={() => void load()} style={styles.headerBtn} hitSlop={12}>
              <RefreshCw color={t.inkMuted} size={20} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.wrap}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? <ActivityIndicator color={t.brand} style={styles.loader} /> : null}

          {err && !loading ? (
            <View style={styles.card}>
              <Text style={styles.err}>{err}</Text>
              <Pressable style={styles.retry} onPress={() => void load()}>
                <Text style={styles.retryTxt}>Tekrar dene</Text>
              </Pressable>
            </View>
          ) : null}

          {foreign ? (
            <View style={styles.alertWarn}>
              <Text style={styles.alertWarnTxt}>Bu iş başka bir kuryede.</Text>
            </View>
          ) : null}

          {d && d.status === 'DELIVERED' ? (
            <View style={styles.alertOk}>
              <Text style={styles.alertOkTxt}>Teslimat tamamlandı.</Text>
            </View>
          ) : null}

          {d && d.status === 'CANCELLED' ? (
            <View style={styles.alertWarn}>
              <Text style={styles.alertWarnTxt}>Bu teslimat iptal edildi.</Text>
            </View>
          ) : null}

          {d ? (
            <>
              <View style={styles.hero}>
                <View style={styles.heroRow}>
                  <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                    <Text style={[styles.statusPillTxt, { color: tone.text }]}>{statusLabel}</Text>
                  </View>
                  <CourierEarningAmount value={d.courierEarning} variant="hero" />
                </View>
                {metaParts.length > 0 ? (
                  <Text style={styles.heroMeta} numberOfLines={2}>
                    {metaParts.join(' · ')}
                  </Text>
                ) : null}
              </View>

              <Block title="Güzergâh">
                <RouteStop
                  title="Alış"
                  personName={d.senderName}
                  address={d.pickupAddress}
                  onMap={() => openMap('Alış', d.pickupAddress)}
                  kind="pickup"
                />
                <RouteStop
                  title="Varış"
                  personName={d.recipientName}
                  address={d.dropoffAddress}
                  onMap={() => openMap('Teslim', d.dropoffAddress)}
                  kind="dropoff"
                  isLast
                />
              </Block>

              {isPackage ? (
                <Block title="Paket içeriği">
                  <Text style={styles.bodyText} selectable>
                    {packageContents || 'İçerik belirtilmemiş'}
                  </Text>
                </Block>
              ) : null}

              <Block title="Sipariş notu">
                <Text
                  style={[styles.bodyText, !orderNote && styles.bodyTextMuted]}
                  selectable={!!orderNote}
                >
                  {orderNoteDisplay}
                </Text>
              </Block>

              {d.status !== 'POOL' ? (
                <Block>
                  {d.supportLinePhone ? (
                    <Pressable style={styles.supportBtn} onPress={() => openTel(d.supportLinePhone!)}>
                      <Phone color={t.onBrand} size={18} />
                      <Text style={styles.supportBtnTxt}>Destek hattı</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.mutedText}>
                      Destek hattı tanımlı değil. Operasyon ekibiyle iletişime geçin.
                    </Text>
                  )}
                </Block>
              ) : null}

              {statusHistory.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Durum geçmişi</Text>
                  <View style={styles.card}>
                    {statusHistory.map((l, i) => {
                      const isLast = i === statusHistory.length - 1;
                      return (
                        <View key={l.id} style={[styles.logRow, !isLast && styles.logRowBorder]}>
                          <View style={styles.logDot} />
                          <View style={styles.logBody}>
                            <Text style={styles.logTitle}>
                              {statusLabelsTr[l.toStatus] ?? l.toStatus}
                            </Text>
                            <Text style={styles.logMeta}>
                              {ACTOR_TR[l.actorType] ?? l.actorType} · {formatLogWhen(l.createdAt)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        {footerVisible && next ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Pressable
              style={[styles.primaryBtn, acting && styles.primaryBtnDisabled]}
              onPress={onPrimary}
              disabled={acting}
            >
              {acting ? (
                <ActivityIndicator color={t.onBrand} />
              ) : (
                <Text style={styles.primaryTxt}>{next.label}</Text>
              )}
            </Pressable>
            <Text style={styles.footerHint}>
              {next.action === 'claim'
                ? 'Adresleri kontrol edip uygunsa üzerinize alabilirsiniz.'
                : 'Sıra: yola çık → paketi al → teslim et.'}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: t.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  headerBtn: { padding: 8, marginRight: 4 },
  loader: { marginTop: 32, marginBottom: 24 },
  card: {
    backgroundColor: t.surface,
    borderRadius: t.radiusLg,
    padding: 14,
    borderWidth: 1,
    borderColor: t.border,
    ...t.shadow,
  },
  block: { marginTop: 12 },
  blockTitle: { color: t.inkMuted, fontSize: 12, fontWeight: '700', marginBottom: 6, marginLeft: 2 },
  hero: {
    backgroundColor: t.surface,
    borderRadius: t.radiusLg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: t.border,
    ...t.shadow,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillTxt: { fontSize: 13, fontWeight: '800' },
  heroMeta: { color: t.inkSecondary, fontSize: 13, lineHeight: 18, marginTop: 8 },
  stop: { paddingVertical: 2 },
  stopBorder: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stopIconPickup: { backgroundColor: t.brandMuted },
  stopIconDrop: { backgroundColor: '#fff7ed' },
  stopMain: { flex: 1, minWidth: 0 },
  stopHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  stopTitle: { color: t.ink, fontSize: 14, fontWeight: '800' },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapLinkTxt: { color: t.brand, fontSize: 13, fontWeight: '700' },
  stopLine: { fontSize: 14, lineHeight: 20 },
  stopLineGap: { marginTop: 6 },
  stopLbl: { color: t.inkMuted, fontWeight: '600' },
  stopVal: { color: t.ink, fontWeight: '600' },
  bodyText: { color: t.ink, fontSize: 15, lineHeight: 22 },
  bodyTextMuted: { color: t.inkMuted, fontStyle: 'italic' },
  mutedText: { color: t.inkMuted, fontSize: 14, lineHeight: 20 },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: t.radiusMd,
    backgroundColor: t.brand,
  },
  supportBtnTxt: { color: t.onBrand, fontSize: 15, fontWeight: '800' },
  logRow: { flexDirection: 'row', gap: 12, paddingVertical: 9 },
  logRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  logDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: t.brand,
    marginTop: 6,
  },
  logBody: { flex: 1 },
  logTitle: { color: t.ink, fontSize: 14, fontWeight: '700' },
  logMeta: { color: t.inkMuted, fontSize: 12, marginTop: 2 },
  err: { color: t.danger, fontSize: 14, lineHeight: 20 },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: t.radiusMd,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  retryTxt: { color: t.brand, fontWeight: '700' },
  alertWarn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 12,
    borderRadius: t.radiusMd,
    marginBottom: 10,
  },
  alertWarnTxt: { color: t.warn, fontWeight: '600', fontSize: 14 },
  alertOk: {
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
    padding: 12,
    borderRadius: t.radiusMd,
    marginBottom: 10,
  },
  alertOkTxt: { color: t.chipText, fontWeight: '600', fontSize: 14 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: t.surface,
    borderTopWidth: 1,
    borderTopColor: t.border,
    ...t.shadow,
  },
  primaryBtn: {
    backgroundColor: t.brand,
    paddingVertical: 16,
    borderRadius: t.radiusMd,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.8 },
  primaryTxt: { color: t.onBrand, fontWeight: '800', fontSize: 16 },
  footerHint: {
    textAlign: 'center',
    color: t.inkMuted,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 16,
  },
});
