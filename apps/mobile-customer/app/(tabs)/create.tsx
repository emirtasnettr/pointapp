import { useCallback, useEffect, useState, useRef, type ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Bike,
  Building2,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Lock,
  MapPin,
  PenLine,
  Phone,
  Send,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DeliveryServiceWizardSelect } from '../../components/DeliveryServiceWizardSelect';
import { DeliveryVatSummary } from '../../components/DeliveryVatSummary';
import { GeoPickerModal } from '../../components/GeoPickerModal';
import { apiGetAuth, apiPostAuth } from '../../lib/api';
import type { CustomerSavedAddressRow } from '../../lib/customer-address-types';
import type { CustomerDeliveryServiceType } from '../../lib/delivery-service-types';
import type { GeoDistrict, GeoNeighborhood } from '../../lib/geography';
import { fetchDistricts, fetchNeighborhoods } from '../../lib/geography';
import { resolveDeliveryVatPricing, type DeliveryVatPricing } from '../../lib/delivery-vat';
import { customerTheme as t } from '../../lib/theme';

type SavedAddr = CustomerSavedAddressRow;

type Me = {
  type?: 'INDIVIDUAL' | 'CORPORATE';
  companyName?: string | null;
  /** API: hesaptaki kayıtlı gönderici adı */
  senderName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  /** Admin panelden açılmadıysa cari ödeme kullanılamaz (API de reddeder). */
  invoiceAccountEnabled?: boolean;
};

const IST = { lat: 41.015137, lng: 28.97953 };

function addrPayload(a: SavedAddr) {
  const nb = a.neighborhood;
  const detail = a.line1?.trim() ?? '';
  const line =
    nb != null
      ? `${nb.district.name}, ${nb.name}${detail ? ` — ${detail}` : ''}`.trim()
      : detail;
  return {
    label: (a.title || 'Adres').trim(),
    line1: line || detail || 'İstanbul',
    city: (a.city || 'İstanbul').trim(),
    lat: a.lat ?? IST.lat,
    lng: a.lng ?? IST.lng,
    neighborhoodId: nb?.id,
    districtId: nb?.district.id,
  };
}

function senderNameFromProfile(m: Me | null): string {
  const fromApi = m?.senderName?.trim();
  if (fromApi) return fromApi;
  if (m?.type === 'CORPORATE' && m.companyName?.trim()) return m.companyName.trim();
  const n = [m?.firstName, m?.lastName].filter(Boolean).join(' ').trim();
  if (n) return n;
  if (m?.phone?.trim()) return `Müşteri (${m.phone.trim()})`;
  return 'Müşteri';
}

const DEMO_CARD_PAN = '4111 1111 1111 1111';
const DEMO_CARD_EXP = '12/28';
const DEMO_CARD_CVV = '123';
const DEMO_OTP = '123456';

function CardPaymentSimulationModal({
  visible,
  pricing,
  onClose,
  onPaid,
}: {
  visible: boolean;
  pricing: DeliveryVatPricing | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  type PaySimStep = 'form' | 'authorizing' | 'threeDS' | 'threeDSProcessing' | 'finalizing' | 'done';
  const [step, setStep] = useState<PaySimStep>('form');
  const [pan, setPan] = useState(DEMO_CARD_PAN);
  const [expiry, setExpiry] = useState(DEMO_CARD_EXP);
  const [cvv, setCvv] = useState(DEMO_CARD_CVV);
  const [otp, setOtp] = useState(DEMO_OTP);

  useEffect(() => {
    if (!visible) return;
    setStep('form');
    setPan(DEMO_CARD_PAN);
    setExpiry(DEMO_CARD_EXP);
    setCvv(DEMO_CARD_CVV);
    setOtp(DEMO_OTP);
  }, [visible]);

  const panDigits = pan.replace(/\D/g, '');
  const expOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.trim());
  const cvvOk = /^\d{3}$/.test(cvv.trim());
  const panOk = panDigits.length === 16;
  const canContinueForm = panOk && expOk && cvvOk;
  const otpOk = /^\d{6}$/.test(otp.trim());

  const dismissible = step === 'form' || step === 'threeDS';

  const goAuthorizing = () => {
    if (!canContinueForm) return;
    setStep('authorizing');
    setTimeout(() => setStep('threeDS'), 1300);
  };

  const goThreeDSComplete = () => {
    if (!otpOk) return;
    setStep('threeDSProcessing');
    setTimeout(() => {
      setStep('finalizing');
      setTimeout(() => {
        setStep('done');
        setTimeout(() => onPaid(), 550);
      }, 1100);
    }, 1400);
  };

  const stepTitle =
    step === 'form'
      ? 'Kredi / Banka Kartı'
      : step === 'authorizing'
        ? 'Banka bağlantısı'
        : step === 'threeDS' || step === 'threeDSProcessing'
          ? '3D Secure'
          : step === 'finalizing'
            ? 'Ödeme tamamlanıyor'
            : 'Ödeme sonucu';

  const stepSub =
    step === 'authorizing'
      ? 'Kartınızı veren bankaya güvenli kanaldan bağlanılıyor…'
      : step === 'threeDSProcessing'
        ? 'Doğrulama kodunuz banka tarafından kontrol ediliyor…'
        : step === 'finalizing'
          ? 'Tutar bloke ediliyor ve siparişe işleniyor…'
          : '';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={dismissible ? onClose : undefined}>
      <View style={payModal.overlay}>
        <Pressable style={payModal.backdrop} onPress={dismissible ? onClose : undefined} />
        <View style={payModal.sheet}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={payModal.sheetScroll}
          >
            <View style={payModal.sheetHead}>
              <Text style={payModal.sheetTitle}>{stepTitle}</Text>
              <Pressable onPress={dismissible ? onClose : undefined} hitSlop={12} accessibilityLabel="Kapat">
                <X size={22} color={dismissible ? t.inkMuted : t.inkSoft} strokeWidth={2.2} />
              </Pressable>
            </View>
            <Text style={payModal.simHint}>
              Demo ödeme: gerçek tahsilat yok. Aşağıdaki bilgiler otomatik doldurulur; 3D Secure adımlarını deneyebilirsiniz.
            </Text>
            {pricing ? (
              <View style={payModal.amountBlock}>
                <DeliveryVatSummary pricing={pricing} compact />
              </View>
            ) : (
              <Text style={payModal.amount}>—</Text>
            )}

            {step === 'form' ? (
              <>
                <Text style={payModal.fieldLab}>Kart numarası</Text>
                <TextInput
                  style={payModal.input}
                  placeholder="16 haneli numara"
                  placeholderTextColor={t.inkSoft}
                  keyboardType="number-pad"
                  maxLength={19}
                  value={pan}
                  onChangeText={(tx) => setPan(tx.replace(/[^\d\s]/g, ''))}
                />
                <View style={payModal.row2}>
                  <View style={payModal.row2Item}>
                    <Text style={payModal.fieldLab}>Son kullanma</Text>
                    <TextInput
                      style={payModal.input}
                      placeholder="AA/YY"
                      placeholderTextColor={t.inkSoft}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      value={expiry}
                      onChangeText={(x) => {
                        const d = x.replace(/\D/g, '').slice(0, 4);
                        const a = d.slice(0, 2);
                        const b = d.slice(2, 4);
                        setExpiry(b ? `${a}/${b}` : a);
                      }}
                    />
                  </View>
                  <View style={[payModal.row2Item, payModal.row2ItemLast]}>
                    <Text style={payModal.fieldLab}>CVC</Text>
                    <TextInput
                      style={payModal.input}
                      placeholder="•••"
                      placeholderTextColor={t.inkSoft}
                      keyboardType="number-pad"
                      maxLength={3}
                      secureTextEntry
                      value={cvv}
                      onChangeText={(x) => setCvv(x.replace(/\D/g, '').slice(0, 3))}
                    />
                  </View>
                </View>
                <Pressable
                  style={[payModal.payBtn, !canContinueForm && payModal.payBtnDis]}
                  onPress={goAuthorizing}
                  disabled={!canContinueForm}
                >
                  <Text style={payModal.payBtnTxt}>Bankaya gönder</Text>
                </Pressable>
              </>
            ) : null}

            {step === 'authorizing' ? (
              <View style={payModal.centerBlock}>
                <ActivityIndicator color={t.brand} size="large" />
                <Text style={payModal.procTxt}>{stepSub}</Text>
              </View>
            ) : null}

            {step === 'threeDS' ? (
              <>
                <View style={payModal.threeDBadge}>
                  <Lock color={t.brand} size={18} strokeWidth={2.2} />
                  <Text style={payModal.threeDBadgeTxt}>Güvenli doğrulama</Text>
                </View>
                <Text style={payModal.threeDLead}>
                  Bankanız ek doğrulama istiyor. Demo ortamında kod otomatik gelir; dilediğiniz 6 haneli sayıyı da
                  girebilirsiniz.
                </Text>
                <Text style={payModal.fieldLab}>SMS / uygulama doğrulama kodu</Text>
                <TextInput
                  style={payModal.input}
                  placeholder="6 hane"
                  placeholderTextColor={t.inkSoft}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(x) => setOtp(x.replace(/\D/g, '').slice(0, 6))}
                />
                <Text style={payModal.demoHint}>Önerilen demo kodu: {DEMO_OTP}</Text>
                <Pressable
                  style={[payModal.payBtn, !otpOk && payModal.payBtnDis]}
                  onPress={goThreeDSComplete}
                  disabled={!otpOk}
                >
                  <Text style={payModal.payBtnTxt}>Doğrula ve ödemeyi tamamla</Text>
                </Pressable>
              </>
            ) : null}

            {step === 'threeDSProcessing' ? (
              <View style={payModal.centerBlock}>
                <ActivityIndicator color={t.brand} size="large" />
                <Text style={payModal.procTxt}>{stepSub}</Text>
              </View>
            ) : null}

            {step === 'finalizing' ? (
              <View style={payModal.centerBlock}>
                <ActivityIndicator color={t.brand} size="large" />
                <Text style={payModal.procTxt}>{stepSub}</Text>
              </View>
            ) : null}

            {step === 'done' ? (
              <View style={payModal.centerBlock}>
                <CheckCircle2 color={t.brand} size={48} strokeWidth={2.2} />
                <Text style={payModal.okTxt}>Ödeme başarıyla tamamlandı</Text>
                <Text style={payModal.okSub}>Siparişiniz oluşturuluyor…</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const payModal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: {
    zIndex: 2,
    maxHeight: '88%',
    borderRadius: t.radiusLg,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
    ...t.shadow,
  },
  sheetScroll: { padding: 18, paddingBottom: 22 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: t.ink, letterSpacing: -0.2, flex: 1, marginRight: 8 },
  simHint: { fontSize: 12, fontWeight: '500', color: t.inkSecondary, lineHeight: 17, marginBottom: 10 },
  amount: { fontSize: 22, fontWeight: '800', color: t.ink, marginBottom: 16 },
  amountBlock: { marginBottom: 16 },
  fieldLab: { fontSize: 12, fontWeight: '700', color: t.inkMuted, marginBottom: 6, marginTop: 4 },
  row2: { flexDirection: 'row', gap: 10 },
  row2Item: { flex: 1 },
  row2ItemLast: { marginRight: 0 },
  input: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: t.ink,
    backgroundColor: t.surface,
    marginBottom: 4,
  },
  payBtn: {
    marginTop: 18,
    backgroundColor: t.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payBtnDis: { opacity: 0.45 },
  payBtnTxt: { color: t.onBrand, fontSize: 16, fontWeight: '700' },
  centerBlock: { alignItems: 'center', paddingVertical: 24 },
  procTxt: { marginTop: 14, fontSize: 15, fontWeight: '600', color: t.inkSecondary, textAlign: 'center', lineHeight: 22 },
  okTxt: { marginTop: 12, fontSize: 17, fontWeight: '800', color: t.ink, textAlign: 'center' },
  okSub: { marginTop: 8, fontSize: 14, fontWeight: '500', color: t.inkMuted, textAlign: 'center' },
  threeDBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: t.brandMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.brandBorder,
    marginBottom: 12,
  },
  threeDBadgeTxt: { fontSize: 13, fontWeight: '800', color: t.chipText },
  threeDLead: { fontSize: 14, lineHeight: 21, fontWeight: '500', color: t.inkSecondary, marginBottom: 12 },
  demoHint: { fontSize: 12, fontWeight: '600', color: t.brand, marginTop: 6, marginBottom: 4 },
});

function FormCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.formCardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.formCardSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export default function CreateDeliveryTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [wizardStep, setWizardStep] = useState<'service' | 'form'>('service');
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [saved, setSaved] = useState<SavedAddr[]>([]);
  const [customerMe, setCustomerMe] = useState<Me | null>(null);

  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paySimVisible, setPaySimVisible] = useState(false);
  /** Kredi kartı simülasyonu bu oturumda tamamlandı mı (tutar/ödeme tipi değişince sıfırlanır). */
  const [cardSimOk, setCardSimOk] = useState(false);
  const cardPaidRef = useRef(false);

  const [pickupKind, setPickupKind] = useState<'saved' | 'manual'>('manual');
  const [pickupId, setPickupId] = useState<string | null>(null);
  const [pickupLabel, setPickupLabel] = useState('');
  const [pickupLine1, setPickupLine1] = useState('');
  const [pickupDistrictId, setPickupDistrictId] = useState<string | null>(null);
  const [pickupNeighborhoodId, setPickupNeighborhoodId] = useState<string | null>(null);
  const [pickupNeighborhoodName, setPickupNeighborhoodName] = useState('');
  const [pickupSaveAddress, setPickupSaveAddress] = useState(false);

  const [dropKind, setDropKind] = useState<'saved' | 'manual'>('manual');
  const [dropId, setDropId] = useState<string | null>(null);
  const [dropLabel, setDropLabel] = useState('');
  const [dropLine1, setDropLine1] = useState('');
  const [dropDistrictId, setDropDistrictId] = useState<string | null>(null);
  const [dropNeighborhoodId, setDropNeighborhoodId] = useState<string | null>(null);
  const [dropNeighborhoodName, setDropNeighborhoodName] = useState('');
  const [dropSaveAddress, setDropSaveAddress] = useState(false);

  const [geoDistricts, setGeoDistricts] = useState<GeoDistrict[]>([]);
  const [geoDistrictsErr, setGeoDistrictsErr] = useState<string | null>(null);

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  const [deliveryType, setDeliveryType] = useState<CustomerDeliveryServiceType>('DOCUMENT');
  const [vehicleType, setVehicleType] = useState<'MOTORCYCLE' | 'CAR'>('MOTORCYCLE');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'WALLET' | 'INVOICE_ACCOUNT'>('CARD');
  const [quotePricing, setQuotePricing] = useState<DeliveryVatPricing | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [weightKg, setWeightKg] = useState('2');

  const applyDefaults = useCallback((items: SavedAddr[]) => {
    const ok = items.filter((x) => x.serviceAvailable);
    if (ok.length >= 2) {
      setPickupKind('saved');
      setPickupId(ok[0].id);
      setDropKind('saved');
      setDropId(ok[1].id);
    } else if (ok.length === 1) {
      setPickupKind('saved');
      setPickupId(ok[0].id);
      setDropKind('manual');
      setDropId(null);
    } else {
      setPickupKind('manual');
      setPickupId(null);
      setDropKind('manual');
      setDropId(null);
    }
  }, []);

  const load = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const [addrRes, meRes] = await Promise.all([
        apiGetAuth<{ items: SavedAddr[] }>('/customer/addresses'),
        apiGetAuth<Me>('/customer/me'),
      ]);
      const items = addrRes.items ?? [];
      setSaved(items);
      setCustomerMe(meRes);
      applyDefaults(items);
    } catch {
      setSaved([]);
      setCustomerMe(null);
      applyDefaults([]);
    } finally {
      setAddressesLoading(false);
    }
  }, [applyDefaults]);

  useEffect(() => {
    const p = params.type;
    if (p === 'DOCUMENT' || p === 'PACKAGE') {
      setDeliveryType(p);
      setWizardStep('form');
    }
  }, [params.type]);

  useEffect(() => {
    if (paymentMethod === 'WALLET') {
      setPaymentMethod('CARD');
      return;
    }
    if (customerMe == null) return;
    if (!customerMe.invoiceAccountEnabled && paymentMethod === 'INVOICE_ACCOUNT') {
      setPaymentMethod('CARD');
    }
  }, [customerMe, paymentMethod]);

  useEffect(() => {
    cardPaidRef.current = false;
    setCardSimOk(false);
  }, [paymentMethod, quotePricing?.totalPrice]);

  useEffect(() => {
    if (wizardStep !== 'form') return;
    cardPaidRef.current = false;
    setCardSimOk(false);
  }, [wizardStep]);

  useFocusEffect(
    useCallback(() => {
      cardPaidRef.current = false;
      setCardSimOk(false);
      void load();
      const id = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
      return () => {
        cancelAnimationFrame(id);
        setWizardStep((prev) => (prev === 'form' ? 'service' : prev));
      };
    }, [load]),
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [wizardStep]);

  const parsedPackageKg = (() => {
    if (deliveryType !== 'PACKAGE') return null;
    const w = parseFloat(weightKg.replace(',', '.').trim());
    return Number.isFinite(w) && w > 0 ? w : null;
  })();
  const motorcycleBlocked = parsedPackageKg != null && parsedPackageKg > 20;

  useEffect(() => {
    if (motorcycleBlocked && vehicleType === 'MOTORCYCLE') {
      setVehicleType('CAR');
    }
  }, [motorcycleBlocked, vehicleType]);

  useEffect(() => {
    if (wizardStep !== 'form') return;
    let cancelled = false;
    setGeoDistrictsErr(null);
    void fetchDistricts()
      .then((list) => {
        if (!cancelled) {
          setGeoDistricts(list);
          if (list.length === 0) {
            setGeoDistrictsErr('İlçe listesi boş. API ve coğrafya seed’ini kontrol edin.');
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = (e as Error).message;
          setGeoDistricts([]);
          setGeoDistrictsErr(msg);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [wizardStep]);

  const resolvePickup = useCallback(() => {
    if (pickupKind === 'saved' && pickupId) {
      const a = saved.find((x) => x.id === pickupId);
      if (a) return addrPayload(a);
    }
    const dName = geoDistricts.find((x) => x.id === pickupDistrictId)?.name?.trim() ?? '';
    const nName = pickupNeighborhoodName.trim();
    const detail = pickupLine1.trim();
    const line1 =
      nName && dName ? `${dName}, ${nName}${detail ? ` — ${detail}` : ''}`.trim() : detail || `${dName}, ${nName}`.trim();
    return {
      label: pickupLabel.trim() || 'Alış',
      line1: line1 || detail,
      city: 'İstanbul',
      lat: IST.lat,
      lng: IST.lng,
      neighborhoodId: pickupNeighborhoodId,
      districtId: pickupDistrictId,
    };
  }, [
    pickupKind,
    pickupId,
    saved,
    pickupLabel,
    pickupLine1,
    pickupDistrictId,
    pickupNeighborhoodName,
    geoDistricts,
  ]);

  const resolveDropoff = useCallback(() => {
    if (dropKind === 'saved' && dropId) {
      const a = saved.find((x) => x.id === dropId);
      if (a) return addrPayload(a);
    }
    const dName = geoDistricts.find((x) => x.id === dropDistrictId)?.name?.trim() ?? '';
    const nName = dropNeighborhoodName.trim();
    const detail = dropLine1.trim();
    const line1 =
      nName && dName ? `${dName}, ${nName}${detail ? ` — ${detail}` : ''}`.trim() : detail || `${dName}, ${nName}`.trim();
    return {
      label: dropLabel.trim() || 'Teslim',
      line1: line1 || detail,
      city: 'İstanbul',
      lat: IST.lat + 0.02,
      lng: IST.lng + 0.02,
      neighborhoodId: dropNeighborhoodId,
      districtId: dropDistrictId,
    };
  }, [dropKind, dropId, saved, dropLabel, dropLine1, dropDistrictId, dropNeighborhoodName, geoDistricts]);

  const canQuote =
    wizardStep === 'form' &&
    ((pickupKind === 'saved' && pickupId) ||
      (pickupKind === 'manual' && pickupDistrictId && pickupNeighborhoodId)) &&
    ((dropKind === 'saved' && dropId) ||
      (dropKind === 'manual' && dropDistrictId && dropNeighborhoodId));

  useEffect(() => {
    if (!canQuote) {
      setQuotePricing(null);
      setQuoteErr(null);
      setQuoteLoading(false);
      return;
    }
    const effVehicle =
      deliveryType === 'PACKAGE' && parsedPackageKg != null && parsedPackageKg > 20
        ? 'CAR'
        : vehicleType;
    if (deliveryType === 'PACKAGE' && parsedPackageKg == null) {
      setQuotePricing(null);
      setQuoteErr(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteErr(null);
    const timer = setTimeout(() => {
      void apiPostAuth<{
        totalPrice: string;
        serviceAmount?: string;
        vatAmount?: string;
      }>('/customer/deliveries/quote', {
        type: deliveryType,
        vehicleType: effVehicle,
        ...(deliveryType === 'PACKAGE' && parsedPackageKg != null ? { weightKg: parsedPackageKg } : {}),
        ...(pickupKind === 'saved' && pickupId
          ? { pickupSavedAddressId: pickupId }
          : { pickupDistrictId, pickupNeighborhoodId }),
        ...(dropKind === 'saved' && dropId
          ? { dropoffSavedAddressId: dropId }
          : { dropoffDistrictId: dropDistrictId, dropoffNeighborhoodId: dropNeighborhoodId }),
      })
        .then((row) => {
          if (!cancelled) {
            setQuotePricing(resolveDeliveryVatPricing(row));
            setQuoteErr(null);
          }
        })
        .catch((e) => {
          if (!cancelled) {
            setQuotePricing(null);
            setQuoteErr((e as Error).message);
          }
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    canQuote,
    deliveryType,
    vehicleType,
    parsedPackageKg,
    pickupKind,
    pickupId,
    pickupDistrictId,
    pickupNeighborhoodId,
    dropKind,
    dropId,
    dropDistrictId,
    dropNeighborhoodId,
  ]);

  const submit = useCallback(async () => {
    setErr(null);
    const pickup = resolvePickup();
    const dropoff = resolveDropoff();
    if (pickupKind === 'manual') {
      if (!pickupDistrictId || !pickupNeighborhoodId) {
        setErr('Alış için ilçe ve mahalle seçin; açık adres satırını doldurun.');
        return;
      }
      if (!pickupLine1.trim()) {
        setErr('Alış adresi için sokak / cadde / bina bilgisi gerekli.');
        return;
      }
    } else if (!pickup.line1) {
      setErr('Alış adresi için kayıtlı adres seçin veya manuel bilgileri doldurun.');
      return;
    }
    if (dropKind === 'manual') {
      if (!dropDistrictId || !dropNeighborhoodId) {
        setErr('Teslim için ilçe ve mahalle seçin; açık adres satırını doldurun.');
        return;
      }
      if (!dropLine1.trim()) {
        setErr('Teslim adresi için sokak / cadde / bina bilgisi gerekli.');
        return;
      }
    } else if (!dropoff.line1) {
      setErr('Teslim adresi için kayıtlı adres seçin veya manuel bilgileri doldurun.');
      return;
    }
    if (pickupKind === 'saved' && pickupId) {
      const pa = saved.find((x) => x.id === pickupId);
      if (pa && !pa.serviceAvailable) {
        setErr(pa.serviceUnavailableReason ?? 'Bu alış adresine şu an hizmet verilememektedir.');
        return;
      }
    }
    if (dropKind === 'saved' && dropId) {
      const da = saved.find((x) => x.id === dropId);
      if (da && !da.serviceAvailable) {
        setErr(da.serviceUnavailableReason ?? 'Bu teslim adresine şu an hizmet verilememektedir.');
        return;
      }
    }
    const senderPhone = customerMe?.phone?.trim() ?? '';
    if (!senderPhone) {
      setErr('Hesabınızda kayıtlı telefon yok. Profilinizi güncelleyin veya destek ile iletişime geçin.');
      return;
    }
    const senderName = senderNameFromProfile(customerMe);
    if (!customerMe?.senderName?.trim() && (!senderName || senderName === 'Müşteri')) {
      setErr('Gönderici adı için profilinizde ad soyad veya şirket ünvanı tanımlı olmalıdır.');
      return;
    }
    if (!recipientName.trim() || !recipientPhone.trim()) {
      setErr('Alıcı adı ve telefon zorunludur.');
      return;
    }
    if (paymentMethod === 'WALLET') {
      setErr('Cüzdan ile ödeme şu an kullanılamıyor.');
      setPaymentMethod('CARD');
      return;
    }
    if (paymentMethod === 'INVOICE_ACCOUNT' && !customerMe?.invoiceAccountEnabled) {
      setErr('Cari (fatura hesabı) ödemesi hesabınız için kapalıdır.');
      setPaymentMethod('CARD');
      return;
    }
    if (!quotePricing?.totalPrice) {
      setErr(quoteErr ?? 'Tutar hesaplanamadı. Adres ve araç bilgilerini kontrol edin.');
      return;
    }
    if (deliveryType === 'PACKAGE') {
      const w = parseFloat(weightKg.replace(',', '.').trim());
      if (!Number.isFinite(w) || w <= 0) {
        setErr('Paket gönderilerinde geçerli bir ağırlık (kg) girin.');
        return;
      }
      const contents = description.trim();
      if (contents.length < 3) {
        setErr('Paket içeriğini yazın (en az 3 karakter). Örn. kıyafet, elektronik, evrak klasörü.');
        return;
      }
    }
    if (paymentMethod === 'CARD' && !cardPaidRef.current) {
      setPaySimVisible(true);
      return;
    }
    const effVehicle =
      deliveryType === 'PACKAGE' && parsedPackageKg != null && parsedPackageKg > 20 ? 'CAR' : vehicleType;
    setSending(true);
    try {
      const res = await apiPostAuth<{ orderNumber: number }>('/customer/deliveries', {
        type: deliveryType,
        vehicleType: effVehicle,
        ...(deliveryType === 'PACKAGE' && parsedPackageKg != null ? { weightKg: parsedPackageKg } : {}),
        pickupAddress: pickup,
        dropoffAddress: dropoff,
        senderName: senderNameFromProfile(customerMe),
        senderPhone,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        paymentMethod,
        ...(deliveryType === 'PACKAGE'
          ? { description: description.trim() }
          : {}),
        notes:
          deliveryType === 'DOCUMENT'
            ? description.trim() || undefined
            : orderNote.trim() || undefined,
      });
      const saveTasks: Promise<unknown>[] = [];
      if (
        pickupKind === 'manual' &&
        pickupSaveAddress &&
        pickupNeighborhoodId &&
        pickupLabel.trim() &&
        pickupLine1.trim()
      ) {
        saveTasks.push(
          apiPostAuth('/customer/addresses', {
            title: pickupLabel.trim(),
            neighborhoodId: pickupNeighborhoodId,
            line1: pickupLine1.trim(),
          }),
        );
      }
      if (
        dropKind === 'manual' &&
        dropSaveAddress &&
        dropNeighborhoodId &&
        dropLabel.trim() &&
        dropLine1.trim()
      ) {
        saveTasks.push(
          apiPostAuth('/customer/addresses', {
            title: dropLabel.trim(),
            neighborhoodId: dropNeighborhoodId,
            line1: dropLine1.trim(),
          }),
        );
      }
      if (saveTasks.length > 0) {
        try {
          await Promise.all(saveTasks);
        } catch (e) {
          Alert.alert('Adres kaydı', (e as Error).message ?? 'Kayıtlı adresler kaydedilemedi; teslimat oluşturuldu.');
        }
      }
      router.push(`/order/${res.orderNumber}`);
      cardPaidRef.current = false;
      setCardSimOk(false);
    } catch (e) {
      setErr((e as Error).message);
      if (paymentMethod === 'CARD') {
        cardPaidRef.current = false;
        setCardSimOk(false);
      }
    } finally {
      setSending(false);
    }
  }, [
    deliveryType,
    vehicleType,
    parsedPackageKg,
    weightKg,
    paymentMethod,
    resolvePickup,
    resolveDropoff,
    customerMe,
    recipientName,
    recipientPhone,
    quotePricing,
    quoteErr,
    description,
    orderNote,
    router,
    pickupKind,
    pickupId,
    pickupDistrictId,
    pickupNeighborhoodId,
    pickupLine1,
    pickupSaveAddress,
    pickupLabel,
    dropKind,
    dropId,
    dropDistrictId,
    dropNeighborhoodId,
    dropLine1,
    dropSaveAddress,
    dropLabel,
    saved,
  ]);

  if (wizardStep === 'service') {
    return (
      <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          style={styles.root}
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Ne gönderiyorsunuz?</Text>
          <Text style={styles.pageLead}>
            Türü seçin; ardından adres, alıcı ve ödeme bilgilerini tamamlayın.
          </Text>
          <DeliveryServiceWizardSelect
            onSelect={(type) => {
              setDeliveryType(type);
              setWizardStep('form');
            }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.root}
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backLink} onPress={() => setWizardStep('service')} hitSlop={8}>
          <ChevronLeft color={t.brand} size={18} strokeWidth={2.4} />
          <Text style={styles.backLinkTxt}>Tür seçimine dön</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Yeni teslimat</Text>
        <Text style={styles.pageLead}>
          Alış ve teslim adreslerini girin. Kayıtlı adresiniz varsa listeden seçebilirsiniz.
        </Text>

        {addressesLoading ? (
          <View style={styles.addrLoadRow}>
            <ActivityIndicator color={t.brand} size="small" />
            <Text style={styles.addrLoadTxt}>Adresler yükleniyor…</Text>
          </View>
        ) : null}

        {geoDistrictsErr ? (
          <View style={styles.geoWarnBanner}>
            <Text style={styles.geoWarnTxt}>İlçe listesi: {geoDistrictsErr}</Text>
          </View>
        ) : null}

        {err ? (
          <View style={styles.errBanner}>
            <Text style={styles.errTxt}>{err}</Text>
          </View>
        ) : null}

        <AddressBlock
          tone="pickup"
          title="Alış noktası"
          hint="Gönderinin toplanacağı adres"
          saved={saved}
          districts={geoDistricts}
          kind={pickupKind}
          setKind={setPickupKind}
          selectedId={pickupId}
          setSelectedId={setPickupId}
          manualLabel={pickupLabel}
          setManualLabel={setPickupLabel}
          manualLine1={pickupLine1}
          setManualLine1={setPickupLine1}
          manualDistrictId={pickupDistrictId}
          setManualDistrictId={setPickupDistrictId}
          manualNeighborhoodId={pickupNeighborhoodId}
          setManualNeighborhoodId={setPickupNeighborhoodId}
          manualNeighborhoodName={pickupNeighborhoodName}
          setManualNeighborhoodName={setPickupNeighborhoodName}
          saveAddress={pickupSaveAddress}
          setSaveAddress={setPickupSaveAddress}
        />

        <AddressBlock
          tone="drop"
          title="Teslim noktası"
          hint="Alıcının teslim alacağı yer"
          saved={saved}
          districts={geoDistricts}
          kind={dropKind}
          setKind={setDropKind}
          selectedId={dropId}
          setSelectedId={setDropId}
          manualLabel={dropLabel}
          setManualLabel={setDropLabel}
          manualLine1={dropLine1}
          setManualLine1={setDropLine1}
          manualDistrictId={dropDistrictId}
          setManualDistrictId={setDropDistrictId}
          manualNeighborhoodId={dropNeighborhoodId}
          setManualNeighborhoodId={setDropNeighborhoodId}
          manualNeighborhoodName={dropNeighborhoodName}
          setManualNeighborhoodName={setDropNeighborhoodName}
          saveAddress={dropSaveAddress}
          setSaveAddress={setDropSaveAddress}
        />

        <FormCard title="Kişiler" subtitle="Gönderen hesabınızdır; alıcı bilgisini girin">
          <View style={styles.senderReadonly}>
            <Text style={styles.senderReadonlyLbl}>Gönderen (hesabınız)</Text>
            <Text style={styles.senderReadonlyVal}>{senderNameFromProfile(customerMe)}</Text>
            <Text style={styles.hint}>Siparişler yalnızca bu ad veya şirket ünvanı ile oluşturulur.</Text>
          </View>
          <Field label="Alıcı adı soyadı" value={recipientName} onChangeText={setRecipientName} placeholder="Ad Soyad" />
          <Field label="Alıcı telefon" value={recipientPhone} onChangeText={setRecipientPhone} placeholder="+90…" keyboardType="phone-pad" last />
        </FormCard>

        <FormCard
          title={deliveryType === 'PACKAGE' ? 'Paket ve araç' : 'Araç'}
          subtitle={
            deliveryType === 'PACKAGE'
              ? 'Önce taşıma tipi, ardından ağırlık ve içerik'
              : 'Gönderiye uygun taşıma tipi'
          }
        >
          <Text style={styles.fieldLabel}>Araç tipi</Text>
          <View style={styles.segRow}>
            <Seg
              active={vehicleType === 'MOTORCYCLE'}
              onPress={() => setVehicleType('MOTORCYCLE')}
              label="Motosiklet"
              Icon={Bike}
              disabled={motorcycleBlocked}
            />
            <Seg active={vehicleType === 'CAR'} onPress={() => setVehicleType('CAR')} label="Araba" Icon={Car} />
          </View>
          {motorcycleBlocked ? (
            <Text style={styles.carHint}>Ağırlık 20 kg üzeri — araç tipi araba olarak ayarlandı.</Text>
          ) : null}
          {deliveryType === 'PACKAGE' ? (
            <View style={styles.packageFields}>
              <Field
                label="Paket ağırlığı (kg)"
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="örn. 2,5"
                keyboardType="decimal-pad"
              />
              <Text style={styles.hint}>20 kg üzeri gönderilerde yalnızca araba kullanılabilir.</Text>
              <Field
                label="Paket içeriği"
                value={description}
                onChangeText={setDescription}
                placeholder="Örn. kıyafet, elektronik, evrak klasörü…"
                multiline
              />
              <Text style={styles.hint}>Kurye ve operasyon bu bilgiyi görür.</Text>
              <Field
                label="Sipariş notu (isteğe bağlı)"
                value={orderNote}
                onChangeText={setOrderNote}
                placeholder="Kapı kodu, kat, zil, teslim tercihi…"
                multiline
                last
              />
            </View>
          ) : null}
        </FormCard>

        {deliveryType === 'DOCUMENT' ? (
          <FormCard title="Not" subtitle="İsteğe bağlı — kurye veya alıcı için kısa bilgi">
            <Field
              label="Sipariş notu"
              value={description}
              onChangeText={setDescription}
              placeholder="Kapı kodu, kat, zil, teslim tercihi…"
              multiline
              last
            />
          </FormCard>
        ) : null}

        <FormCard title="Ödeme" subtitle="Yöntem ve KDV dahil genel toplam">
          <View style={styles.payRow}>
            <CardPayRowOption active={paymentMethod === 'CARD'} onPress={() => setPaymentMethod('CARD')} />
            {customerMe?.invoiceAccountEnabled ? (
              <PayChip
                active={paymentMethod === 'INVOICE_ACCOUNT'}
                onPress={() => setPaymentMethod('INVOICE_ACCOUNT')}
                label="Cari"
                Icon={Building2}
              />
            ) : null}
          </View>
          {paymentMethod === 'CARD' ? (
            <Text style={cardSimOk ? styles.payStatusOk : styles.payStatusWait}>
              {cardSimOk
                ? 'Simüle ödeme (3D Secure dahil) onaylandı; siparişi oluşturabilirsiniz.'
                : 'Kredi kartı ile sipariş açmadan önce banka ve 3D Secure simülasyonunu tamamlamanız gerekir. “Teslimatı oluştur” dediğinizde ödeme ekranı açılır.'}
            </Text>
          ) : null}
          {quoteLoading ? (
            <DeliveryVatSummary pricing={null} loading />
          ) : quotePricing ? (
            <DeliveryVatSummary pricing={quotePricing} />
          ) : quoteErr ? (
            <Text style={styles.quoteErrTxt}>{quoteErr}</Text>
          ) : (
            <Text style={styles.hint}>
              {canQuote ? 'Hesaplanıyor…' : 'Adres ve araç seçildikten sonra fiyat görünür'}
            </Text>
          )}
          {quotePricing ? (
            <Text style={styles.hint}>
              Teslimat ücreti güzergâh, araç ve ağırlığa göre hesaplanır; tahsilat KDV dahil genel toplam üzerinden
              yapılır.
            </Text>
          ) : null}
        </FormCard>

        <Pressable
          style={[styles.ctaOuter, sending && styles.ctaDis]}
          onPress={() => void submit()}
          disabled={sending}
        >
          <LinearGradient colors={[...t.gradientHero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGrad}>
            {sending ? (
              <ActivityIndicator color={t.onBrand} />
            ) : (
              <>
                <Send color={t.onBrand} size={20} strokeWidth={2.2} />
                <Text style={styles.ctaTxt}>Teslimatı oluştur</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
    <CardPaymentSimulationModal
      visible={paySimVisible}
      pricing={quotePricing}
      onClose={() => setPaySimVisible(false)}
      onPaid={() => {
        cardPaidRef.current = true;
        setCardSimOk(true);
        setPaySimVisible(false);
        queueMicrotask(() => {
          void submit();
        });
      }}
    />
  </>
  );
}

function AddressBlock({
  tone,
  title,
  hint,
  saved,
  districts,
  kind,
  setKind,
  selectedId,
  setSelectedId,
  manualLabel,
  setManualLabel,
  manualLine1,
  setManualLine1,
  manualDistrictId,
  setManualDistrictId,
  manualNeighborhoodId,
  setManualNeighborhoodId,
  manualNeighborhoodName,
  setManualNeighborhoodName,
  saveAddress,
  setSaveAddress,
}: {
  tone: 'pickup' | 'drop';
  title: string;
  hint: string;
  saved: SavedAddr[];
  districts: GeoDistrict[];
  kind: 'saved' | 'manual';
  setKind: (k: 'saved' | 'manual') => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  manualLabel: string;
  setManualLabel: (s: string) => void;
  manualLine1: string;
  setManualLine1: (s: string) => void;
  manualDistrictId: string | null;
  setManualDistrictId: (id: string | null) => void;
  manualNeighborhoodId: string | null;
  setManualNeighborhoodId: (id: string | null) => void;
  manualNeighborhoodName: string;
  setManualNeighborhoodName: (s: string) => void;
  saveAddress: boolean;
  setSaveAddress: (v: boolean) => void;
}) {
  const accent = tone === 'pickup' ? t.brand : '#6366f1';
  const hasSaved = saved.length > 0;
  const hasSelectable = saved.some((x) => x.serviceAvailable);
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = selectedId ? saved.find((x) => x.id === selectedId) : undefined;

  const [distOpen, setDistOpen] = useState(false);
  const [nbOpen, setNbOpen] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<GeoNeighborhood[]>([]);
  const [nbLoading, setNbLoading] = useState(false);

  useEffect(() => {
    if (!manualDistrictId) {
      setNeighborhoods([]);
      return;
    }
    let cancelled = false;
    setNbLoading(true);
    void fetchNeighborhoods(manualDistrictId)
      .then((list) => {
        if (!cancelled) setNeighborhoods(list);
      })
      .catch(() => {
        if (!cancelled) setNeighborhoods([]);
      })
      .finally(() => {
        if (!cancelled) setNbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [manualDistrictId]);

  const districtTitle = districts.find((d) => d.id === manualDistrictId)?.name ?? '';

  useEffect(() => {
    if (kind !== 'saved' || !selectedId) return;
    const sel = saved.find((x) => x.id === selectedId);
    if (sel && !sel.serviceAvailable) {
      const fallback = saved.find((x) => x.serviceAvailable);
      setSelectedId(fallback?.id ?? null);
    }
  }, [kind, selectedId, saved, setSelectedId]);

  return (
    <FormCard title={title} subtitle={hint}>
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => {
              if (!hasSelectable) return;
              setKind('saved');
              const first = saved.find((x) => x.serviceAvailable);
              if (first) setSelectedId(first.id);
            }}
            style={[styles.tab, kind === 'saved' && styles.tabOn, (!hasSaved || !hasSelectable) && styles.tabOff]}
            disabled={!hasSaved || !hasSelectable}
          >
            <MapPin size={16} color={kind === 'saved' ? t.brand : t.inkSoft} strokeWidth={2.2} />
            <Text style={[styles.tabTxt, kind === 'saved' && styles.tabTxtOn]}>Kayıtlı</Text>
          </Pressable>
          <Pressable onPress={() => setKind('manual')} style={[styles.tab, kind === 'manual' && styles.tabOn]}>
            <PenLine size={16} color={kind === 'manual' ? t.brand : t.inkSoft} strokeWidth={2.2} />
            <Text style={[styles.tabTxt, kind === 'manual' && styles.tabTxtOn]}>Manuel</Text>
          </Pressable>
        </View>
        {!hasSaved ? <Text style={styles.warnInline}>Hesabınızda kayıtlı adres yok; manuel giriş kullanın.</Text> : null}
        {hasSaved && !hasSelectable ? (
          <Text style={styles.warnInline}>
            Kayıtlı adreslerinizin tamamı şu an hizmet dışındadır; teslimat için manuel adres girin.
          </Text>
        ) : null}

        {kind === 'saved' ? (
          <>
            <Text style={styles.selectLab}>Kayıtlı adres</Text>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={[styles.selectTrigger, { borderColor: selected ? accent : t.border }]}
            >
              <View style={styles.selectTriggerBody}>
                {selected ? (
                  <>
                    <Text style={styles.selectTitle} numberOfLines={1}>
                      {selected.title}
                    </Text>
                    <Text style={styles.selectSub} numberOfLines={2}>
                      {selected.line1} · {selected.city}
                    </Text>
                    {!selected.serviceAvailable && selected.serviceUnavailableReason ? (
                      <Text style={styles.addrSvcWarn}>{selected.serviceUnavailableReason}</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.selectPlaceholder}>Adres seçin…</Text>
                )}
              </View>
              <ChevronDown color={t.inkMuted} size={22} strokeWidth={2.2} />
            </Pressable>

            <Modal visible={pickerOpen} animationType="fade" transparent onRequestClose={() => setPickerOpen(false)}>
              <View style={styles.modalWrap}>
                <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)} />
                <View style={styles.modalSheet}>
                  <Text style={styles.modalTitle}>Adres seçin</Text>
                  <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                    {saved.map((a) => {
                      const on = a.id === selectedId;
                      const dis = !a.serviceAvailable;
                      return (
                        <Pressable
                          key={a.id}
                          disabled={dis}
                          onPress={() => {
                            if (dis) return;
                            setSelectedId(a.id);
                            setPickerOpen(false);
                          }}
                          style={[
                            styles.modalRow,
                            on && { borderLeftWidth: 4, borderLeftColor: accent, backgroundColor: t.surfaceMuted },
                            dis && { opacity: 0.65 },
                          ]}
                        >
                          <Text style={styles.modalRowTitle}>{a.title}</Text>
                          <Text style={styles.modalRowSub} numberOfLines={2}>
                            {a.line1}
                          </Text>
                          <Text style={styles.modalRowCity}>{a.city}</Text>
                          {dis && a.serviceUnavailableReason ? (
                            <Text style={styles.modalRowWarn}>{a.serviceUnavailableReason}</Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Pressable style={styles.modalClose} onPress={() => setPickerOpen(false)}>
                    <Text style={styles.modalCloseTxt}>Kapat</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          </>
        ) : (
          <>
            <Text style={styles.manualGeoLead}>İlçe ve mahalle seçin; sokak / bina bilgisini yazın. İl alanı yoktur (İstanbul).</Text>
            <Field
              label="Kısa ad (isteğe bağlı)"
              value={manualLabel}
              onChangeText={setManualLabel}
              placeholder="Örn. Şube — boş bırakılabilir"
            />
            <Text style={styles.fieldLabel}>İlçe</Text>
            <Pressable
              onPress={() => setDistOpen(true)}
              style={[styles.geoSelect, { borderColor: manualDistrictId ? accent : t.border }]}
            >
              <MapPin size={18} color={accent} strokeWidth={2.2} />
              <Text style={[styles.geoSelectTxt, !districtTitle && styles.geoSelectPh]} numberOfLines={1}>
                {districtTitle || 'İlçe seçin…'}
              </Text>
              <ChevronDown size={20} color={t.inkMuted} strokeWidth={2.2} />
            </Pressable>
            <Text style={styles.fieldLabel}>Mahalle</Text>
            <Pressable
              onPress={() => manualDistrictId && setNbOpen(true)}
              disabled={!manualDistrictId}
              style={[styles.geoSelect, !manualDistrictId && styles.geoSelectDis, { borderColor: manualNeighborhoodId ? accent : t.border }]}
            >
              <MapPin size={18} color="#6366f1" strokeWidth={2.2} />
              <Text style={[styles.geoSelectTxt, !manualNeighborhoodName && styles.geoSelectPh]} numberOfLines={1}>
                {manualNeighborhoodName || 'Mahalle seçin…'}
              </Text>
              <ChevronDown size={20} color={t.inkMuted} strokeWidth={2.2} />
            </Pressable>
            <Field
              label="Sokak, cadde, bina no, kat / daire"
              value={manualLine1}
              onChangeText={setManualLine1}
              placeholder="Örn. Büyükdere Cad. No:199"
              multiline
            />
            <View style={styles.saveRow}>
              <View style={styles.saveRowText}>
                <Text style={styles.saveRowTitle}>Adresi kaydet</Text>
                <Text style={styles.saveRowSub}>İşaretlerseniz bu adres kayıtlı adreslerinize eklenir.</Text>
              </View>
              <Switch
                value={saveAddress}
                onValueChange={setSaveAddress}
                trackColor={{ false: t.border, true: 'rgba(22, 178, 75, 0.35)' }}
                thumbColor={saveAddress ? t.brand : '#f4f4f5'}
              />
            </View>
            <GeoPickerModal
              visible={distOpen}
              title="İlçe seçin"
              items={districts.map((d) => ({ id: d.id, title: d.name }))}
              loading={false}
              onClose={() => setDistOpen(false)}
              onSelect={(id) => {
                setManualDistrictId(id);
                setManualNeighborhoodId(null);
                setManualNeighborhoodName('');
              }}
            />
            <GeoPickerModal
              visible={nbOpen}
              title="Mahalle seçin"
              items={neighborhoods.map((n) => ({ id: n.id, title: n.name }))}
              loading={nbLoading}
              listExtraData={`${manualDistrictId ?? ''}-${neighborhoods.length}`}
              onClose={() => setNbOpen(false)}
              onSelect={(id) => {
                const n = neighborhoods.find((x) => x.id === id);
                setManualNeighborhoodId(id);
                setManualNeighborhoodName(n?.name ?? '');
              }}
            />
          </>
        )}
    </FormCard>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  last,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.field, last && styles.fieldLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.inp, multiline && styles.inpMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.inkSoft}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
      />
    </View>
  );
}

function Seg({
  active,
  onPress,
  label,
  Icon,
  disabled,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  Icon: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[styles.seg, active && styles.segOn, disabled && styles.segDis]}
    >
      <Icon size={20} color={active ? t.brand : disabled ? t.inkSoft : t.inkMuted} strokeWidth={2.2} />
      <Text style={[styles.segLab, active && styles.segLabOn, disabled && styles.segLabDis]}>{label}</Text>
    </Pressable>
  );
}

function CardPayRowOption({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.payCardOption, active && styles.payCardOptionOn]}>
      <View style={[styles.payCardIconWrap, active && styles.payCardIconWrapOn]}>
        <CreditCard size={22} color={active ? t.brand : t.inkSecondary} strokeWidth={2.1} />
      </View>
      <Text
        style={[styles.payCardLabel, active && styles.payCardLabelOn]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        Kredi / Banka Kartı
      </Text>
    </Pressable>
  );
}

function PayChip({
  active,
  onPress,
  label,
  Icon,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pay, active && styles.payOn]}>
      <Icon size={18} color={active ? t.brand : t.inkMuted} strokeWidth={2.2} />
      <Text style={[styles.payLab, active && styles.payLabOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.bg },
  root: { flex: 1 },
  pad: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: t.ink,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  pageLead: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
    color: t.inkMuted,
    lineHeight: 20,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 10,
    paddingVertical: 4,
  },
  backLinkTxt: { fontSize: 15, fontWeight: '700', color: t.brand },
  formCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    ...t.shadow,
  },
  formCardTitle: { fontSize: 17, fontWeight: '800', color: t.ink, letterSpacing: -0.2 },
  formCardSub: { marginTop: 4, marginBottom: 14, fontSize: 13, lineHeight: 19, color: t.inkMuted },
  addrLoadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  addrLoadTxt: { fontSize: 13, color: t.inkSecondary, fontWeight: '600' },
  geoWarnBanner: {
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: t.warn,
  },
  geoWarnTxt: { fontSize: 13, fontWeight: '600', color: t.warn, lineHeight: 18 },
  errBanner: {
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: t.dangerBg,
    borderLeftWidth: 3,
    borderLeftColor: t.danger,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    padding: 4,
    borderRadius: t.radiusMd,
    backgroundColor: t.surfaceMuted,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: t.radiusSm,
    backgroundColor: 'transparent',
  },
  tabOn: { backgroundColor: t.surface, ...t.shadowTight },
  tabOff: { opacity: 0.45 },
  tabTxt: { fontSize: 14, fontWeight: '700', color: t.inkMuted },
  tabTxtOn: { color: t.brand },
  warnInline: { fontSize: 12, color: t.warn, fontWeight: '600', marginBottom: 10 },
  manualGeoLead: {
    fontSize: 13,
    color: t.inkMuted,
    lineHeight: 19,
    fontWeight: '500',
    marginBottom: 14,
  },
  geoSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: t.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: t.surfaceMuted,
    marginBottom: 12,
  },
  geoSelectDis: { opacity: 0.45 },
  geoSelectTxt: { flex: 1, fontSize: 16, fontWeight: '700', color: t.ink },
  geoSelectPh: { color: t.inkSoft, fontWeight: '600' },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  saveRowText: { flex: 1, minWidth: 0 },
  saveRowTitle: { fontSize: 15, fontWeight: '800', color: t.ink },
  saveRowSub: { marginTop: 4, fontSize: 12, fontWeight: '500', color: t.inkMuted, lineHeight: 17 },
  selectLab: { fontSize: 12, fontWeight: '700', color: t.inkSecondary, marginBottom: 8 },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: t.surface,
    gap: 10,
  },
  selectTriggerBody: { flex: 1, minWidth: 0 },
  selectTitle: { fontSize: 15, fontWeight: '800', color: t.ink },
  selectSub: { marginTop: 4, fontSize: 13, fontWeight: '500', color: t.inkSecondary, lineHeight: 18 },
  addrSvcWarn: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#b45309', lineHeight: 17 },
  selectPlaceholder: { fontSize: 15, color: t.inkSoft, fontWeight: '600' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  modalSheet: {
    marginHorizontal: 14,
    marginBottom: 28,
    maxHeight: '72%',
    borderRadius: 14,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#28303d',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      default: { elevation: 8 },
    }),
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: t.ink, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  modalScroll: { maxHeight: 360 },
  modalRow: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  modalRowTitle: { fontSize: 16, fontWeight: '800', color: t.ink },
  modalRowSub: { marginTop: 4, fontSize: 14, color: t.inkSecondary, lineHeight: 19 },
  modalRowCity: { marginTop: 4, fontSize: 12, fontWeight: '700', color: t.inkMuted },
  modalRowWarn: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#b45309', lineHeight: 17 },
  modalClose: { paddingVertical: 14, alignItems: 'center', backgroundColor: t.surfaceMuted },
  modalCloseTxt: { fontSize: 16, fontWeight: '800', color: t.brand },
  field: { marginBottom: 12 },
  fieldLast: { marginBottom: 0 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: t.inkSecondary, marginBottom: 6 },
  inp: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: t.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: t.ink,
    backgroundColor: t.surfaceMuted,
  },
  inpMulti: { minHeight: 80, textAlignVertical: 'top' },
  packageFields: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.border,
  },
  segRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  seg: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: t.radiusSm,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surfaceMuted,
  },
  segOn: { borderColor: t.brand, backgroundColor: t.brandMuted },
  segDis: { opacity: 0.42 },
  segLab: { fontSize: 13, fontWeight: '800', color: t.inkMuted },
  segLabOn: { color: t.brand },
  segLabDis: { color: t.inkSoft },
  payRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'stretch' },
  payCardOption: {
    flex: 1.25,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    ...t.shadowTight,
  },
  payCardOptionOn: {
    borderColor: t.brandBorder,
    backgroundColor: t.brandMuted,
  },
  payCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(22, 178, 75, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(22, 178, 75, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payCardIconWrapOn: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: t.brandBorder,
  },
  payCardLabel: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: t.inkMuted,
    letterSpacing: -0.15,
  },
  payCardLabelOn: { color: t.ink },
  pay: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    gap: 6,
    ...t.shadowTight,
  },
  payOn: { borderColor: t.brandBorder, backgroundColor: t.brandMuted },
  payLab: { fontSize: 12, fontWeight: '800', color: t.inkMuted, textAlign: 'center' },
  payLabOn: { color: t.brand },
  payStatusWait: {
    fontSize: 12,
    fontWeight: '500',
    color: t.inkSecondary,
    lineHeight: 17,
    marginBottom: 10,
    marginTop: 2,
  },
  payStatusOk: {
    fontSize: 12,
    fontWeight: '600',
    color: t.success,
    lineHeight: 17,
    marginBottom: 10,
    marginTop: 2,
  },
  senderReadonly: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  senderReadonlyLbl: { fontSize: 12, fontWeight: '600', color: t.inkMuted, marginBottom: 4 },
  senderReadonlyVal: { fontSize: 16, fontWeight: '700', color: t.ink },
  hint: { fontSize: 12, fontWeight: '500', color: t.inkMuted, marginTop: 6, lineHeight: 17 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: t.radiusSm,
    backgroundColor: t.surfaceMuted,
    borderWidth: 1,
    borderColor: t.border,
  },
  priceLbl: { fontSize: 14, fontWeight: '600', color: t.inkSecondary },
  priceVal: { fontSize: 20, fontWeight: '800', color: t.brand },
  pricePending: { flex: 1, fontSize: 13, fontWeight: '500', color: t.inkMuted, textAlign: 'right' },
  quoteErrTxt: { marginTop: 8, fontSize: 13, fontWeight: '600', color: t.danger, lineHeight: 18 },
  carHint: { marginTop: 12, fontSize: 12, fontWeight: '600', color: t.brand },
  ctaOuter: { marginTop: 24, borderRadius: 999, overflow: 'hidden' },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  ctaDis: { opacity: 0.75 },
  ctaTxt: { color: t.onBrand, fontSize: 17, fontWeight: '800' },
  errTxt: { color: t.danger, fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
