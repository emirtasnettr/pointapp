'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bike,
  Building2,
  Car,
  ChevronLeft,
  CreditCard,
  Loader2,
  Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CustomerDeliveryServiceType } from '../lib/delivery-service-types';
import { resolveDeliveryVatPricing, type DeliveryVatPricing } from '../lib/delivery-vat';
import { AddressBlock } from '../components/AddressBlock';
import { CardPaymentSimulationModal } from '../components/CardPaymentSimulationModal';
import { DeliveryServiceWizardSelect } from '../components/DeliveryServiceWizardSelect';
import { DeliveryVatSummary } from '../components/DeliveryVatSummary';
import { FormCard } from '../components/FormCard';
import { DeliveryWizardLayout } from '../components/DeliveryWizardLayout';
import type { CustomerMe, GeoDistrict, SavedAddressRow } from '../types';

const IST = { lat: 41.015137, lng: 28.97953 };

function addrPayload(a: SavedAddressRow) {
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

function senderNameFromProfile(m: CustomerMe | null): string {
  const fromApi = m?.senderName?.trim();
  if (fromApi) return fromApi;
  if (m?.type === 'CORPORATE' && m.companyName?.trim()) return m.companyName.trim();
  const n = [m?.firstName, m?.lastName].filter(Boolean).join(' ').trim();
  if (n) return n;
  if (m?.phone?.trim()) return `Müşteri (${m.phone.trim()})`;
  return 'Müşteri';
}

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-zinc-200 bg-zinc-50/90 px-3.5 py-3 text-base text-zinc-900 outline-none transition focus:border-[#16B24B]/40 focus:ring-2 focus:ring-[#16B24B]/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100';

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <label className="mb-3 block last:mb-0">
      <span className="text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">{label}</span>
      <Tag
        type={multiline ? undefined : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        className={fieldClass}
      />
    </label>
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
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[10px] border py-3.5 transition ${
        active
          ? 'border-[#16B24B] bg-[#16B24B]/10'
          : 'border-zinc-200 bg-zinc-50/90 dark:border-zinc-600 dark:bg-zinc-900'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Icon className={`h-5 w-5 ${active ? 'text-[#16B24B]' : 'text-zinc-500'}`} strokeWidth={2.2} />
      <span className={`text-[13px] font-extrabold ${active ? 'text-[#16B24B]' : 'text-zinc-500'}`}>{label}</span>
    </button>
  );
}

export type AuthenticatedDeliveryFlowProps = {
  initialType?: CustomerDeliveryServiceType;
  apiGetAuth: <T>(path: string) => Promise<T>;
  apiPostAuth: <T>(path: string, body: unknown) => Promise<T>;
  fetchDistricts: () => Promise<GeoDistrict[]>;
  fetchNeighborhoods: (districtId: string) => Promise<{ id: string; name: string }[]>;
  onCreated: (orderNumber: number) => void;
  profileGate?: ReactNode;
};

export function AuthenticatedDeliveryFlow({
  initialType,
  apiGetAuth,
  apiPostAuth,
  fetchDistricts,
  fetchNeighborhoods,
  onCreated,
  profileGate,
}: AuthenticatedDeliveryFlowProps) {
  const [wizardStep, setWizardStep] = useState<'service' | 'form'>(initialType ? 'form' : 'service');
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [saved, setSaved] = useState<SavedAddressRow[]>([]);
  const [customerMe, setCustomerMe] = useState<CustomerMe | null>(null);

  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paySimVisible, setPaySimVisible] = useState(false);
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

  const [deliveryType, setDeliveryType] = useState<CustomerDeliveryServiceType>(initialType ?? 'DOCUMENT');
  const [vehicleType, setVehicleType] = useState<'MOTORCYCLE' | 'CAR'>('MOTORCYCLE');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'INVOICE_ACCOUNT'>('CARD');
  const [quotePricing, setQuotePricing] = useState<DeliveryVatPricing | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [weightKg, setWeightKg] = useState('2');

  const applyDefaults = useCallback((items: SavedAddressRow[]) => {
    const ok = items.filter((x) => x.serviceAvailable);
    if (ok.length >= 2) {
      setPickupKind('saved');
      setPickupId(ok[0]!.id);
      setDropKind('saved');
      setDropId(ok[1]!.id);
    } else if (ok.length === 1) {
      setPickupKind('saved');
      setPickupId(ok[0]!.id);
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
        apiGetAuth<{ items: SavedAddressRow[] }>('/customer/addresses'),
        apiGetAuth<CustomerMe>('/customer/me'),
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
  }, [apiGetAuth, applyDefaults]);

  useEffect(() => {
    if (initialType) {
      setDeliveryType(initialType);
      setWizardStep('form');
    }
  }, [initialType]);

  useEffect(() => {
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

  useEffect(() => {
    void load();
  }, [load]);

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
          setGeoDistricts([]);
          setGeoDistrictsErr((e as Error).message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [wizardStep, fetchDistricts]);

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
    pickupNeighborhoodId,
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
  }, [dropKind, dropId, saved, dropLabel, dropLine1, dropDistrictId, dropNeighborhoodName, geoDistricts, dropNeighborhoodId]);

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
      deliveryType === 'PACKAGE' && parsedPackageKg != null && parsedPackageKg > 20 ? 'CAR' : vehicleType;
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
    apiPostAuth,
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
        ...(deliveryType === 'PACKAGE' ? { description: description.trim() } : {}),
        notes:
          deliveryType === 'DOCUMENT' ? description.trim() || undefined : orderNote.trim() || undefined,
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
          window.alert(
            (e as Error).message ?? 'Kayıtlı adresler kaydedilemedi; teslimat oluşturuldu.',
          );
        }
      }
      onCreated(res.orderNumber);
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
    onCreated,
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
    apiPostAuth,
  ]);

  if (profileGate) return <>{profileGate}</>;

  if (wizardStep === 'service') {
    return (
      <DeliveryWizardLayout variant="service">
        <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
          Ne gönderiyorsunuz?
        </h1>
        <p className="mb-4 mt-2 max-w-prose text-sm leading-snug text-zinc-500">
          Türü seçin; ardından adres, alıcı ve ödeme bilgilerini tamamlayın.
        </p>
        <DeliveryServiceWizardSelect
          onSelect={(type) => {
            setDeliveryType(type);
            setWizardStep('form');
          }}
        />
      </DeliveryWizardLayout>
    );
  }

  return (
    <>
      <DeliveryWizardLayout variant="form">
        <button
          type="button"
          onClick={() => setWizardStep('service')}
          className="mb-2.5 inline-flex items-center gap-1 py-1 text-[15px] font-bold text-[#16B24B]"
        >
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
          Tür seçimine dön
        </button>
        <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Yeni teslimat</h1>
        <p className="mb-4 mt-2 text-sm leading-snug text-zinc-500">
          Alış ve teslim adreslerini girin. Kayıtlı adresiniz varsa listeden seçebilirsiniz.
        </p>

        {addressesLoading ? (
          <div className="mb-2 flex items-center gap-2 py-1.5">
            <Loader2 className="h-4 w-4 animate-spin text-[#16B24B]" />
            <span className="text-[13px] font-semibold text-zinc-600">Adresler yükleniyor…</span>
          </div>
        ) : null}

        {geoDistrictsErr ? (
          <p className="mb-2 rounded-[10px] border-l-[3px] border-amber-500 bg-amber-500/10 px-3 py-2.5 text-[13px] font-semibold text-amber-800">
            İlçe listesi: {geoDistrictsErr}
          </p>
        ) : null}

        {err ? (
          <p className="mb-2 rounded-[10px] border-l-[3px] border-red-500 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800 dark:bg-red-500/10 dark:text-red-200">
            {err}
          </p>
        ) : null}

        <AddressBlock
          tone="pickup"
          title="Alış noktası"
          hint="Gönderinin toplanacağı adres"
          saved={saved}
          districts={geoDistricts}
          fetchNeighborhoods={fetchNeighborhoods}
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
          fetchNeighborhoods={fetchNeighborhoods}
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
          <div className="mb-4 border-b border-zinc-200 pb-4 dark:border-white/10">
            <p className="text-xs font-semibold text-zinc-500">Gönderen (hesabınız)</p>
            <p className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-50">{senderNameFromProfile(customerMe)}</p>
            <p className="mt-1.5 text-xs font-medium leading-snug text-zinc-500">
              Siparişler yalnızca bu ad veya şirket ünvanı ile oluşturulur.
            </p>
          </div>
          <Field label="Alıcı adı soyadı" value={recipientName} onChange={setRecipientName} placeholder="Ad Soyad" />
          <Field label="Alıcı telefon" value={recipientPhone} onChange={setRecipientPhone} placeholder="+90…" type="tel" />
        </FormCard>

        <FormCard
          title={deliveryType === 'PACKAGE' ? 'Paket ve araç' : 'Araç'}
          subtitle={
            deliveryType === 'PACKAGE'
              ? 'Önce taşıma tipi, ardından ağırlık ve içerik'
              : 'Gönderiye uygun taşıma tipi'
          }
        >
          <p className="mb-1.5 text-[13px] font-semibold text-zinc-600">Araç tipi</p>
          <div className="mb-1 flex gap-2.5">
            <Seg
              active={vehicleType === 'MOTORCYCLE'}
              onPress={() => setVehicleType('MOTORCYCLE')}
              label="Motosiklet"
              Icon={Bike}
              disabled={motorcycleBlocked}
            />
            <Seg active={vehicleType === 'CAR'} onPress={() => setVehicleType('CAR')} label="Araba" Icon={Car} />
          </div>
          {motorcycleBlocked ? (
            <p className="mt-3 text-xs font-semibold text-[#16B24B]">
              Ağırlık 20 kg üzeri — araç tipi araba olarak ayarlandı.
            </p>
          ) : null}
          {deliveryType === 'PACKAGE' ? (
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-white/10">
              <Field
                label="Paket ağırlığı (kg)"
                value={weightKg}
                onChange={setWeightKg}
                placeholder="örn. 2,5"
                type="text"
              />
              <p className="mb-3 text-xs font-medium text-zinc-500">20 kg üzeri gönderilerde yalnızca araba kullanılabilir.</p>
              <Field
                label="Paket içeriği"
                value={description}
                onChange={setDescription}
                placeholder="Örn. kıyafet, elektronik, evrak klasörü…"
                multiline
              />
              <p className="mb-3 text-xs font-medium text-zinc-500">Kurye ve operasyon bu bilgiyi görür.</p>
              <Field
                label="Sipariş notu (isteğe bağlı)"
                value={orderNote}
                onChange={setOrderNote}
                placeholder="Kapı kodu, kat, zil, teslim tercihi…"
                multiline
              />
            </div>
          ) : null}
        </FormCard>

        {deliveryType === 'DOCUMENT' ? (
          <FormCard title="Not" subtitle="İsteğe bağlı — kurye veya alıcı için kısa bilgi">
            <Field
              label="Sipariş notu"
              value={description}
              onChange={setDescription}
              placeholder="Kapı kodu, kat, zil, teslim tercihi…"
              multiline
            />
          </FormCard>
        ) : null}

        <FormCard title="Ödeme" subtitle="Yöntem ve KDV dahil genel toplam">
          <div className="mb-3 flex gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              className={`flex min-h-[60px] flex-[1.25] items-center gap-3 rounded-[14px] border px-3 py-3 shadow-sm transition ${
                paymentMethod === 'CARD'
                  ? 'border-[#16B24B]/35 bg-[#16B24B]/10'
                  : 'border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900'
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                  paymentMethod === 'CARD'
                    ? 'border-[#16B24B]/35 bg-white'
                    : 'border-[#16B24B]/20 bg-[#16B24B]/10'
                }`}
              >
                <CreditCard className={`h-[22px] w-[22px] ${paymentMethod === 'CARD' ? 'text-[#16B24B]' : 'text-zinc-600'}`} />
              </span>
              <span className={`text-[12.5px] font-extrabold ${paymentMethod === 'CARD' ? 'text-zinc-900' : 'text-zinc-500'}`}>
                Kredi / Banka Kartı
              </span>
            </button>
            {customerMe?.invoiceAccountEnabled ? (
              <button
                type="button"
                onClick={() => setPaymentMethod('INVOICE_ACCOUNT')}
                className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[14px] border px-2 py-2.5 shadow-sm ${
                  paymentMethod === 'INVOICE_ACCOUNT'
                    ? 'border-[#16B24B]/35 bg-[#16B24B]/10'
                    : 'border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900'
                }`}
              >
                <Building2 className={`h-[18px] w-[18px] ${paymentMethod === 'INVOICE_ACCOUNT' ? 'text-[#16B24B]' : 'text-zinc-500'}`} />
                <span className={`text-xs font-extrabold ${paymentMethod === 'INVOICE_ACCOUNT' ? 'text-[#16B24B]' : 'text-zinc-500'}`}>
                  Cari
                </span>
              </button>
            ) : null}
          </div>
          {paymentMethod === 'CARD' ? (
            <p className={`mb-2.5 text-xs leading-snug ${cardSimOk ? 'font-semibold text-emerald-700' : 'font-medium text-zinc-600'}`}>
              {cardSimOk
                ? 'Simüle ödeme (3D Secure dahil) onaylandı; siparişi oluşturabilirsiniz.'
                : 'Kredi kartı ile sipariş açmadan önce banka ve 3D Secure simülasyonunu tamamlamanız gerekir. “Teslimatı oluştur” dediğinizde ödeme ekranı açılır.'}
            </p>
          ) : null}
          {quoteLoading ? (
            <DeliveryVatSummary pricing={null} loading />
          ) : quotePricing ? (
            <DeliveryVatSummary pricing={quotePricing} />
          ) : quoteErr ? (
            <p className="mt-2 text-[13px] font-semibold leading-snug text-red-700">{quoteErr}</p>
          ) : (
            <p className="text-xs font-medium text-zinc-500">
              {canQuote ? 'Hesaplanıyor…' : 'Adres ve araç seçildikten sonra fiyat görünür'}
            </p>
          )}
          {quotePricing ? (
            <p className="mt-1.5 text-xs font-medium leading-snug text-zinc-500">
              Teslimat ücreti güzergâh, araç ve ağırlığa göre hesaplanır; tahsilat KDV dahil genel toplam üzerinden yapılır.
            </p>
          ) : null}
        </FormCard>

        <button
          type="button"
          disabled={sending}
          onClick={() => void submit()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#16B24B] to-[#0f7a32] py-4 text-[17px] font-extrabold text-white shadow-md disabled:opacity-75"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Send className="h-5 w-5" strokeWidth={2.2} />
              Teslimatı oluştur
            </>
          )}
        </button>
      </DeliveryWizardLayout>

      <CardPaymentSimulationModal
        open={paySimVisible}
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
