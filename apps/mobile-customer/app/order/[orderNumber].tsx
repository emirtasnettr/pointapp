import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { FileText, MapPin, MapPinned, RefreshCw, Truck } from 'lucide-react-native';
import { apiGetAuth } from '../../lib/api';
import { DeliveryInvoiceBadge } from '../../lib/delivery-invoice-badge';
import { openCustomerDeliveryInvoice } from '../../lib/open-customer-invoice';
import { deliveryStatusLabel } from '../../lib/delivery-status';
import { deliveryTypeShortLabel } from '../../lib/delivery-service-types';
import { formatPackageWeightKg, formatTry } from '../../lib/delivery-display';
import { resolveDeliveryVatPricing } from '../../lib/delivery-vat';
import { formatAddressSnapshot } from '../../lib/format-delivery-address';
import { customerTheme as t } from '../../lib/theme';

type StatusLog = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorType: string;
  createdAt: string;
};

type Delivery = {
  id: string;
  orderNumber: number;
  status: string;
  type?: string;
  description?: string | null;
  notes?: string | null;
  weightKg?: string | null;
  vehicleType?: string;
  pickupAddress?: Record<string, unknown>;
  dropoffAddress?: Record<string, unknown>;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  totalPrice: string;
  priceBreakdown?: Record<string, unknown> | null;
  paymentMethod: string;
  paymentStatus: string;
  courier?: { publicId?: string; displayNameMasked?: string | null } | null;
  statusLogs?: StatusLog[];
  customerInvoiceCount?: number;
  customerInvoices?: Array<{
    id: string;
    invoiceNumber: string | null;
    fileName: string;
    createdAt: string;
    orderNumbers: number[];
    deliveryCount: number;
  }>;
};

const paymentMethodTr: Record<string, string> = {
  CARD: 'Kredi / banka kartı',
  WALLET: 'Cüzdan',
  INVOICE_ACCOUNT: 'Cari hesap',
};

const paymentStatusTr: Record<string, string> = {
  PENDING: 'Bekliyor',
  AUTHORIZED: 'Yetkilendirildi',
  CAPTURED: 'Ödeme tamamlandı',
  FAILED: 'Başarısız',
  REFUNDED: 'İade',
};

const actorTr: Record<string, string> = {
  customer: 'Müşteri',
  courier: 'Kurye',
  system: 'Sistem',
  staff: 'Operasyon',
};

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
      return { bg: t.dangerBg, border: 'rgba(220, 38, 38, 0.2)', text: t.danger };
    case 'POOL':
    case 'PENDING':
      return { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };
    case 'COURIER_ASSIGNED':
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
  phone,
  address,
  kind,
  isLast,
}: {
  title: string;
  personName?: string;
  phone?: string;
  address?: Record<string, unknown>;
  kind: 'pickup' | 'dropoff';
  isLast?: boolean;
}) {
  const isPickup = kind === 'pickup';
  const Icon = isPickup ? MapPin : MapPinned;
  const iconColor = isPickup ? t.brand : '#b45309';
  const person = personName?.trim() || '—';
  const addr = formatAddressSnapshot(address);
  const phoneLine = phone?.trim() || '—';

  return (
    <View style={[styles.stop, !isLast && styles.stopBorder]}>
      <View style={styles.stopRow}>
        <View style={[styles.stopIcon, isPickup ? styles.stopIconPickup : styles.stopIconDrop]}>
          <Icon color={iconColor} size={16} strokeWidth={2.4} />
        </View>
        <View style={styles.stopMain}>
          <Text style={styles.stopTitle}>{title}</Text>
          <Text style={styles.stopLine} selectable>
            <Text style={styles.stopLbl}>Kişi adı: </Text>
            <Text style={styles.stopVal}>{person}</Text>
          </Text>
          <Text style={[styles.stopLine, styles.stopLineGap]} selectable>
            <Text style={styles.stopLbl}>Telefon: </Text>
            <Text style={styles.stopVal}>{phoneLine}</Text>
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

export default function OrderDetailScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const [d, setD] = useState<Delivery | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const ref = String(orderNumber ?? '').trim();
    if (!ref) return;
    setErr(null);
    try {
      const row = await apiGetAuth<Delivery>(`/customer/deliveries/${encodeURIComponent(ref)}`);
      setD(row);
    } catch (e) {
      setErr((e as Error).message);
      setD(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusHistory = useMemo(() => {
    if (!d?.statusLogs?.length) return [];
    return [...d.statusLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [d?.statusLogs]);

  const tone = d ? statusTone(d.status) : statusTone('POOL');
  const statusLabel = d ? deliveryStatusLabel(d.status) : '';
  const isPackage = d?.type === 'PACKAGE';
  const packageContents = d?.description?.trim() ?? '';
  const orderNote =
    d?.notes?.trim() || (d?.type === 'DOCUMENT' ? d?.description?.trim() : '') || '';
  const orderNoteDisplay = orderNote || 'Sipariş notu yok.';
  const typeLabel = deliveryTypeShortLabel(d?.type ?? 'DOCUMENT');
  const vehicleLabel =
    d?.vehicleType === 'MOTORCYCLE' ? 'Motosiklet' : d?.vehicleType === 'CAR' ? 'Araba' : null;
  const weightLabel = isPackage ? formatPackageWeightKg(d?.weightKg) : null;

  const metaParts = [typeLabel, vehicleLabel, weightLabel].filter(Boolean);

  const pb = d?.priceBreakdown;
  const vatPricing =
    d && typeof pb?.serviceAmount === 'string' && typeof pb?.vatAmount === 'string'
      ? resolveDeliveryVatPricing({
          totalPrice: d.totalPrice,
          serviceAmount: pb.serviceAmount,
          vatAmount: pb.vatAmount,
        })
      : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: d ? `Teslimat #${d.orderNumber}` : 'Teslimat',
          headerBackTitle: 'Geri',
          headerStyle: { backgroundColor: t.surface },
          headerTintColor: t.ink,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', color: t.ink, fontSize: 17 },
          headerRight: () => (
            <Pressable
              onPress={() => {
                setRefreshing(true);
                void load();
              }}
              style={styles.headerBtn}
              hitSlop={12}
            >
              <RefreshCw color={t.inkMuted} size={20} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.wrap}>
        <ScrollView
          contentContainerStyle={styles.scroll}
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
                  <View style={styles.heroPriceCol}>
                    <Text style={styles.heroPrice}>{formatTry(d.totalPrice)}</Text>
                    {vatPricing ? <Text style={styles.heroPriceHint}>Genel toplam (KDV dahil)</Text> : null}
                  </View>
                </View>
                {metaParts.length > 0 ? (
                  <Text style={styles.heroMeta} numberOfLines={2}>
                    {metaParts.join(' · ')}
                  </Text>
                ) : null}
                <View style={styles.heroInvoiceBadge}>
                  <DeliveryInvoiceBadge status={d.status} customerInvoiceCount={d.customerInvoiceCount} />
                </View>
              </View>

              <Block title="Güzergâh">
                <RouteStop
                  title="Alış noktası"
                  personName={d.senderName}
                  phone={d.senderPhone}
                  address={d.pickupAddress}
                  kind="pickup"
                />
                <RouteStop
                  title="Varış noktası"
                  personName={d.recipientName}
                  phone={d.recipientPhone}
                  address={d.dropoffAddress}
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

              {d.status === 'DELIVERED' ? (
                <Block title="Faturalar">
                  {(d.customerInvoices?.length ?? 0) > 0 ? (
                    d.customerInvoices!.map((inv) => (
                      <Pressable
                        key={inv.id}
                        style={styles.invoiceRow}
                        onPress={() => void openCustomerDeliveryInvoice(inv.id)}
                      >
                        <FileText color={t.brand} size={18} strokeWidth={2.2} />
                        <View style={styles.invoiceRowBody}>
                          <Text style={styles.invoiceTitle} numberOfLines={1}>
                            {inv.invoiceNumber || inv.fileName}
                          </Text>
                          <Text style={styles.invoiceSub}>
                            {new Date(inv.createdAt).toLocaleString('tr-TR')}
                            {inv.deliveryCount > 1 ? ` · ${inv.deliveryCount} sipariş` : ''}
                          </Text>
                        </View>
                        <Text style={styles.invoiceOpen}>Aç</Text>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={styles.bodyTextMuted}>
                      Faturanız hazırlanıyor. Yüklendiğinde burada görüntüleyebilirsiniz.
                    </Text>
                  )}
                </Block>
              ) : null}

              <Block title="Ödeme">
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>Yöntem</Text>
                  <Text style={styles.kvVal}>{paymentMethodTr[d.paymentMethod] ?? d.paymentMethod}</Text>
                </View>
                <View style={styles.kvDivider} />
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>Ödeme durumu</Text>
                  <Text style={styles.kvVal}>{paymentStatusTr[d.paymentStatus] ?? d.paymentStatus}</Text>
                </View>
                {vatPricing ? (
                  <>
                    <View style={styles.kvDivider} />
                    <View style={styles.kvRow}>
                      <Text style={styles.kvKey}>Teslimat ücreti</Text>
                      <Text style={styles.kvVal}>{formatTry(vatPricing.serviceAmount)}</Text>
                    </View>
                    <View style={styles.kvDivider} />
                    <View style={styles.kvRow}>
                      <Text style={styles.kvKey}>KDV (%20)</Text>
                      <Text style={styles.kvVal}>{formatTry(vatPricing.vatAmount)}</Text>
                    </View>
                    <View style={styles.kvDivider} />
                    <View style={styles.kvRow}>
                      <Text style={styles.kvKey}>Genel toplam</Text>
                      <Text style={[styles.kvVal, styles.kvValStrong]}>{formatTry(vatPricing.totalPrice)}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.kvDivider} />
                    <View style={styles.kvRow}>
                      <Text style={styles.kvKey}>Tutar</Text>
                      <Text style={styles.kvVal}>{formatTry(d.totalPrice)}</Text>
                    </View>
                  </>
                )}
              </Block>

              {d.courier ? (
                <Block title="Kurye">
                  <View style={styles.courierRow}>
                    <Truck color={t.brand} size={20} strokeWidth={2.2} />
                    <View style={styles.courierBody}>
                      <Text style={styles.courierLbl}>Atanan kurye</Text>
                      <Text style={styles.courierName}>
                        {d.courier.displayNameMasked?.trim() || 'Kurye'}
                      </Text>
                    </View>
                  </View>
                </Block>
              ) : null}

              {statusHistory.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Durum geçmişi</Text>
                  <View style={styles.card}>
                    {statusHistory.map((log, i) => {
                      const isLast = i === statusHistory.length - 1;
                      return (
                        <View key={log.id} style={[styles.logRow, !isLast && styles.logRowBorder]}>
                          <View style={styles.logDot} />
                          <View style={styles.logBody}>
                            <Text style={styles.logTitle}>{deliveryStatusLabel(log.toStatus)}</Text>
                            <Text style={styles.logMeta}>
                              {formatLogWhen(log.createdAt)}
                              {log.actorType
                                ? ` · ${actorTr[log.actorType] ?? log.actorType}`
                                : ''}
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: t.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
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
  block: { marginTop: 20 },
  blockTitle: {
    color: t.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 2,
  },
  hero: {
    backgroundColor: t.surface,
    borderRadius: t.radiusLg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: t.border,
    marginBottom: 4,
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
  heroPriceCol: { alignItems: 'flex-end' },
  heroPrice: { color: t.brand, fontSize: 18, fontWeight: '800' },
  heroPriceHint: { marginTop: 2, fontSize: 11, fontWeight: '600', color: t.inkMuted },
  heroMeta: { color: t.inkSecondary, fontSize: 13, lineHeight: 18, marginTop: 8 },
  heroInvoiceBadge: { marginTop: 10 },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  invoiceRowBody: { flex: 1, minWidth: 0 },
  invoiceTitle: { fontSize: 14, fontWeight: '700', color: t.ink },
  invoiceSub: { fontSize: 12, color: t.inkMuted, marginTop: 2 },
  invoiceOpen: { fontSize: 12, fontWeight: '700', color: t.brand },
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
  stopTitle: { color: t.ink, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  stopLine: { fontSize: 14, lineHeight: 20 },
  stopLineGap: { marginTop: 6 },
  stopLbl: { color: t.inkMuted, fontWeight: '600' },
  stopVal: { color: t.ink, fontWeight: '600' },
  bodyText: { color: t.ink, fontSize: 15, lineHeight: 22 },
  bodyTextMuted: { color: t.inkMuted, fontStyle: 'italic' },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 2,
  },
  kvKey: { color: t.inkMuted, fontSize: 14, fontWeight: '600' },
  kvVal: { flex: 1, color: t.ink, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  kvValStrong: { fontSize: 15, fontWeight: '800', color: t.brand },
  kvDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.border,
    marginVertical: 10,
  },
  courierRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courierBody: { flex: 1 },
  courierLbl: { color: t.inkMuted, fontSize: 12, fontWeight: '700' },
  courierName: { marginTop: 4, color: t.ink, fontSize: 16, fontWeight: '800' },
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
});
