'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bike,
  Car,
  ChevronLeft,
  CreditCard,
  Loader2,
  MapPin,
  Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CustomerDeliveryServiceType } from '../lib/delivery-service-types';
import { resolveDeliveryVatPricing, type DeliveryVatPricing } from '../lib/delivery-vat';
import { CardPaymentSimulationModal } from '../components/CardPaymentSimulationModal';
import { DeliveryServiceWizardSelect } from '../components/DeliveryServiceWizardSelect';
import { DeliveryVatSummary } from '../components/DeliveryVatSummary';
import { FormCard } from '../components/FormCard';
import { DeliveryWizardLayout } from '../components/DeliveryWizardLayout';
import { GeoPickerModal } from '../components/GeoPickerModal';
import type { GeoDistrict } from '../types';

const IST = { lat: 41.015137, lng: 28.97953 };

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-zinc-200 bg-zinc-50/90 px-3.5 py-3 text-base text-zinc-900 outline-none transition focus:border-[#16B24B]/40 focus:ring-2 focus:ring-[#16B24B]/15';

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
      <span className="text-[13px] font-semibold text-zinc-600">{label}</span>
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
      className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[10px] border py-3.5 ${
        active ? 'border-[#16B24B] bg-[#16B24B]/10' : 'border-zinc-200 bg-zinc-50/90'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Icon className={`h-5 w-5 ${active ? 'text-[#16B24B]' : 'text-zinc-500'}`} strokeWidth={2.2} />
      <span className={`text-[13px] font-extrabold ${active ? 'text-[#16B24B]' : 'text-zinc-500'}`}>{label}</span>
    </button>
  );
}

function ManualAddressCard({
  tone,
  title,
  hint,
  districts,
  fetchNeighborhoods,
  districtId,
  setDistrictId,
  neighborhoodId,
  setNeighborhoodId,
  neighborhoodName,
  setNeighborhoodName,
  line1,
  setLine1,
}: {
  tone: 'pickup' | 'drop';
  title: string;
  hint: string;
  districts: GeoDistrict[];
  fetchNeighborhoods: (districtId: string) => Promise<{ id: string; name: string }[]>;
  districtId: string | null;
  setDistrictId: (id: string | null) => void;
  neighborhoodId: string | null;
  setNeighborhoodId: (id: string | null) => void;
  neighborhoodName: string;
  setNeighborhoodName: (s: string) => void;
  line1: string;
  setLine1: (s: string) => void;
}) {
  const accent = tone === 'pickup' ? '#16B24B' : '#6366f1';
  const [distOpen, setDistOpen] = useState(false);
  const [nbOpen, setNbOpen] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);
  const [nbLoading, setNbLoading] = useState(false);

  useEffect(() => {
    if (!districtId) {
      setNeighborhoods([]);
      return;
    }
    let cancelled = false;
    setNbLoading(true);
    void fetchNeighborhoods(districtId)
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
  }, [districtId, fetchNeighborhoods]);

  const districtTitle = districts.find((d) => d.id === districtId)?.name ?? '';

  return (
    <FormCard title={title} subtitle={hint}>
      <p className="mb-3.5 text-[13px] font-medium leading-snug text-zinc-500">
        İlçe ve mahalle seçin; sokak / bina bilgisini yazın. İl alanı yoktur (İstanbul).
      </p>
      <p className="mb-1.5 text-[13px] font-semibold text-zinc-600">İlçe</p>
      <button
        type="button"
        onClick={() => setDistOpen(true)}
        className="mb-3 flex w-full items-center gap-2.5 rounded-[10px] border bg-zinc-50/90 px-3 py-3 text-left"
        style={{ borderColor: districtId ? accent : undefined }}
      >
        <MapPin className="h-[18px] w-[18px]" style={{ color: accent }} strokeWidth={2.2} />
        <span className={`flex-1 truncate text-base font-bold ${districtTitle ? 'text-zinc-900' : 'text-zinc-400'}`}>
          {districtTitle || 'İlçe seçin…'}
        </span>
      </button>
      <p className="mb-1.5 text-[13px] font-semibold text-zinc-600">Mahalle</p>
      <button
        type="button"
        onClick={() => districtId && setNbOpen(true)}
        disabled={!districtId}
        className="mb-3 flex w-full items-center gap-2.5 rounded-[10px] border bg-zinc-50/90 px-3 py-3 text-left disabled:opacity-45"
        style={{ borderColor: neighborhoodId ? accent : undefined }}
      >
        <MapPin className="h-[18px] w-[18px] text-indigo-500" strokeWidth={2.2} />
        <span className={`flex-1 truncate text-base font-bold ${neighborhoodName ? 'text-zinc-900' : 'text-zinc-400'}`}>
          {neighborhoodName || 'Mahalle seçin…'}
        </span>
      </button>
      <Field
        label="Sokak, cadde, bina no, kat / daire"
        value={line1}
        onChange={setLine1}
        placeholder="Örn. Büyükdere Cad. No:199"
        multiline
      />
      <GeoPickerModal
        open={distOpen}
        title="İlçe seçin"
        items={districts.map((d) => ({ id: d.id, title: d.name }))}
        onClose={() => setDistOpen(false)}
        onSelect={(id) => {
          setDistrictId(id);
          setNeighborhoodId(null);
          setNeighborhoodName('');
        }}
      />
      <GeoPickerModal
        open={nbOpen}
        title="Mahalle seçin"
        items={neighborhoods.map((n) => ({ id: n.id, title: n.name }))}
        loading={nbLoading}
        onClose={() => setNbOpen(false)}
        onSelect={(id) => {
          const n = neighborhoods.find((x) => x.id === id);
          setNeighborhoodId(id);
          setNeighborhoodName(n?.name ?? '');
        }}
      />
    </FormCard>
  );
}

export type GuestDeliveryFlowProps = {
  initialType?: CustomerDeliveryServiceType;
  initialPickupDistrictId?: string;
  initialDropoffDistrictId?: string;
  fetchDistricts: () => Promise<GeoDistrict[]>;
  fetchNeighborhoods: (districtId: string) => Promise<{ id: string; name: string }[]>;
  fetchQuote: (body: {
    pickupDistrictId: string;
    pickupNeighborhoodId: string;
    dropoffDistrictId: string;
    dropoffNeighborhoodId: string;
    type: CustomerDeliveryServiceType;
    vehicleType: 'MOTORCYCLE' | 'CAR';
    weightKg?: number;
  }) => Promise<{ totalPrice: string; serviceAmount?: string; vatAmount?: string }>;
  createDelivery: (body: unknown) => Promise<{ orderNumber: number }>;
  normalizePhone: (phone: string) => string;
  onCreated: (orderNumber: number) => void;
  loginBanner?: React.ReactNode;
};

export function GuestDeliveryFlow({
  initialType,
  initialPickupDistrictId,
  initialDropoffDistrictId,
  fetchDistricts,
  fetchNeighborhoods,
  fetchQuote,
  createDelivery,
  normalizePhone,
  onCreated,
  loginBanner,
}: GuestDeliveryFlowProps) {
  const [wizardStep, setWizardStep] = useState<'service' | 'form'>(initialType ? 'form' : 'service');
  const [deliveryType, setDeliveryType] = useState<CustomerDeliveryServiceType>(initialType ?? 'DOCUMENT');
  const [vehicleType, setVehicleType] = useState<'MOTORCYCLE' | 'CAR'>('MOTORCYCLE');
  const [weightKg, setWeightKg] = useState('2');
  const [description, setDescription] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const [pickupDistrictId, setPickupDistrictId] = useState<string | null>(initialPickupDistrictId ?? null);
  const [dropoffDistrictId, setDropoffDistrictId] = useState<string | null>(initialDropoffDistrictId ?? null);
  const [pickupNeighborhoodId, setPickupNeighborhoodId] = useState<string | null>(null);
  const [dropoffNeighborhoodId, setDropoffNeighborhoodId] = useState<string | null>(null);
  const [pickupNeighborhoodName, setPickupNeighborhoodName] = useState('');
  const [dropoffNeighborhoodName, setDropoffNeighborhoodName] = useState('');
  const [pickupLine1, setPickupLine1] = useState('');
  const [dropoffLine1, setDropoffLine1] = useState('');

  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  const [geoDistricts, setGeoDistricts] = useState<GeoDistrict[]>([]);
  const [geoDistrictsErr, setGeoDistrictsErr] = useState<string | null>(null);
  const [quotePricing, setQuotePricing] = useState<DeliveryVatPricing | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [paySimVisible, setPaySimVisible] = useState(false);
  const [cardSimOk, setCardSimOk] = useState(false);
  const cardPaidRef = useRef(false);

  useEffect(() => {
    if (initialType) {
      setDeliveryType(initialType);
      setWizardStep('form');
    }
  }, [initialType]);

  useEffect(() => {
    cardPaidRef.current = false;
    setCardSimOk(false);
  }, [quotePricing?.totalPrice, pickupDistrictId, dropoffDistrictId, deliveryType, vehicleType, weightKg]);

  useEffect(() => {
    if (wizardStep !== 'form') return;
    let cancelled = false;
    setGeoDistrictsErr(null);
    void fetchDistricts()
      .then((list) => {
        if (!cancelled) setGeoDistricts(list);
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
    if (motorcycleBlocked && vehicleType === 'MOTORCYCLE') setVehicleType('CAR');
  }, [motorcycleBlocked, vehicleType]);

  const canQuote =
    wizardStep === 'form' &&
    Boolean(pickupDistrictId && pickupNeighborhoodId && dropoffDistrictId && dropoffNeighborhoodId);

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
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteErr(null);
    const timer = setTimeout(() => {
      void fetchQuote({
        pickupDistrictId: pickupDistrictId!,
        pickupNeighborhoodId: pickupNeighborhoodId!,
        dropoffDistrictId: dropoffDistrictId!,
        dropoffNeighborhoodId: dropoffNeighborhoodId!,
        type: deliveryType,
        vehicleType: effVehicle,
        ...(deliveryType === 'PACKAGE' && parsedPackageKg != null ? { weightKg: parsedPackageKg } : {}),
      })
        .then((row) => {
          if (!cancelled) setQuotePricing(resolveDeliveryVatPricing(row));
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
    pickupDistrictId,
    pickupNeighborhoodId,
    dropoffDistrictId,
    dropoffNeighborhoodId,
    fetchQuote,
  ]);

  const lineFromGeo = useCallback(
    (districtId: string | null, neighborhoodName: string, detail: string) => {
      const dName = geoDistricts.find((d) => d.id === districtId)?.name?.trim() ?? '';
      const nName = neighborhoodName.trim();
      const d = detail.trim();
      if (nName && dName) return `${dName}, ${nName}${d ? ` — ${d}` : ''}`.trim();
      return d || `${dName}, ${nName}`.trim();
    },
    [geoDistricts],
  );

  const submit = useCallback(async () => {
    setErr(null);
    if (!pickupDistrictId || !pickupNeighborhoodId || !pickupLine1.trim()) {
      setErr('Alış için ilçe, mahalle ve açık adres gerekli.');
      return;
    }
    if (!dropoffDistrictId || !dropoffNeighborhoodId || !dropoffLine1.trim()) {
      setErr('Teslim için ilçe, mahalle ve açık adres gerekli.');
      return;
    }
    if (!senderName.trim() || !senderPhone.trim() || !recipientName.trim() || !recipientPhone.trim()) {
      setErr('Gönderici ve alıcı adı / telefon zorunludur.');
      return;
    }
    if (!quotePricing?.totalPrice) {
      setErr(quoteErr ?? 'Tutar hesaplanamadı.');
      return;
    }
    if (deliveryType === 'PACKAGE') {
      if (!parsedPackageKg) {
        setErr('Paket gönderilerinde geçerli ağırlık girin.');
        return;
      }
      if (description.trim().length < 3) {
        setErr('Paket içeriğini yazın (en az 3 karakter).');
        return;
      }
    }
    if (!cardPaidRef.current) {
      setPaySimVisible(true);
      return;
    }
    const effVehicle =
      deliveryType === 'PACKAGE' && parsedPackageKg != null && parsedPackageKg > 20 ? 'CAR' : vehicleType;
    setSending(true);
    try {
      const res = await createDelivery({
        type: deliveryType,
        vehicleType: effVehicle,
        paymentMethod: 'CARD',
        senderName: senderName.trim(),
        senderPhone: normalizePhone(senderPhone),
        recipientName: recipientName.trim(),
        recipientPhone: normalizePhone(recipientPhone),
        ...(deliveryType === 'PACKAGE' && parsedPackageKg != null ? { weightKg: parsedPackageKg } : {}),
        ...(deliveryType === 'PACKAGE' ? { description: description.trim() } : {}),
        notes: deliveryType === 'DOCUMENT' ? description.trim() || undefined : orderNote.trim() || undefined,
        pickupAddress: {
          label: 'Alış',
          line1: lineFromGeo(pickupDistrictId, pickupNeighborhoodName, pickupLine1),
          city: 'İstanbul',
          lat: IST.lat,
          lng: IST.lng,
          districtId: pickupDistrictId,
          neighborhoodId: pickupNeighborhoodId,
        },
        dropoffAddress: {
          label: 'Teslim',
          line1: lineFromGeo(dropoffDistrictId, dropoffNeighborhoodName, dropoffLine1),
          city: 'İstanbul',
          lat: IST.lat + 0.02,
          lng: IST.lng + 0.02,
          districtId: dropoffDistrictId,
          neighborhoodId: dropoffNeighborhoodId,
        },
      });
      onCreated(res.orderNumber);
      cardPaidRef.current = false;
      setCardSimOk(false);
    } catch (e) {
      setErr((e as Error).message);
      cardPaidRef.current = false;
      setCardSimOk(false);
    } finally {
      setSending(false);
    }
  }, [
    pickupDistrictId,
    pickupNeighborhoodId,
    pickupLine1,
    dropoffDistrictId,
    dropoffNeighborhoodId,
    dropoffLine1,
    senderName,
    senderPhone,
    recipientName,
    recipientPhone,
    quotePricing,
    quoteErr,
    deliveryType,
    parsedPackageKg,
    description,
    orderNote,
    vehicleType,
    createDelivery,
    normalizePhone,
    onCreated,
    lineFromGeo,
    pickupNeighborhoodName,
    dropoffNeighborhoodName,
  ]);

  if (wizardStep === 'service') {
    return (
      <DeliveryWizardLayout variant="service">
        {loginBanner}
        <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-900 sm:text-2xl">Ne gönderiyorsunuz?</h1>
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
        {loginBanner}
        <button
          type="button"
          onClick={() => setWizardStep('service')}
          className="mb-2.5 inline-flex items-center gap-1 py-1 text-[15px] font-bold text-[#16B24B]"
        >
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
          Tür seçimine dön
        </button>
        <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-900">Gönderi oluştur</h1>
        <p className="mb-4 mt-2 text-sm leading-snug text-zinc-500">
          Alış ve teslim adreslerini girin; üye olmadan kart ile ödeyebilirsiniz.
        </p>

        {geoDistrictsErr ? (
          <p className="mb-2 rounded-[10px] border-l-[3px] border-amber-500 bg-amber-500/10 px-3 py-2.5 text-[13px] font-semibold text-amber-800">
            İlçe listesi: {geoDistrictsErr}
          </p>
        ) : null}
        {err ? (
          <p className="mb-2 rounded-[10px] border-l-[3px] border-red-500 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">
            {err}
          </p>
        ) : null}

        <ManualAddressCard
          tone="pickup"
          title="Alış noktası"
          hint="Gönderinin toplanacağı adres"
          districts={geoDistricts}
          fetchNeighborhoods={fetchNeighborhoods}
          districtId={pickupDistrictId}
          setDistrictId={setPickupDistrictId}
          neighborhoodId={pickupNeighborhoodId}
          setNeighborhoodId={setPickupNeighborhoodId}
          neighborhoodName={pickupNeighborhoodName}
          setNeighborhoodName={setPickupNeighborhoodName}
          line1={pickupLine1}
          setLine1={setPickupLine1}
        />
        <ManualAddressCard
          tone="drop"
          title="Teslim noktası"
          hint="Alıcının teslim alacağı yer"
          districts={geoDistricts}
          fetchNeighborhoods={fetchNeighborhoods}
          districtId={dropoffDistrictId}
          setDistrictId={setDropoffDistrictId}
          neighborhoodId={dropoffNeighborhoodId}
          setNeighborhoodId={setDropoffNeighborhoodId}
          neighborhoodName={dropoffNeighborhoodName}
          setNeighborhoodName={setDropoffNeighborhoodName}
          line1={dropoffLine1}
          setLine1={setDropoffLine1}
        />

        <FormCard title="Kişiler" subtitle="Gönderici ve alıcı bilgileri">
          <Field label="Gönderici adı soyadı" value={senderName} onChange={setSenderName} placeholder="Ad Soyad" />
          <Field label="Gönderici telefon" value={senderPhone} onChange={setSenderPhone} placeholder="+90…" type="tel" />
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
            <div className="mt-4 border-t border-zinc-200 pt-4">
              <Field label="Paket ağırlığı (kg)" value={weightKg} onChange={setWeightKg} placeholder="örn. 2,5" />
              <Field
                label="Paket içeriği"
                value={description}
                onChange={setDescription}
                placeholder="Örn. kıyafet, elektronik…"
                multiline
              />
              <Field
                label="Sipariş notu (isteğe bağlı)"
                value={orderNote}
                onChange={setOrderNote}
                placeholder="Kapı kodu, kat…"
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
              placeholder="Kapı kodu, kat, zil…"
              multiline
            />
          </FormCard>
        ) : null}

        <FormCard title="Ödeme" subtitle="Yöntem ve KDV dahil genel toplam">
          <div className="mb-3 flex min-h-[60px] items-center gap-3 rounded-[14px] border border-[#16B24B]/35 bg-[#16B24B]/10 px-3 py-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#16B24B]/35 bg-white">
              <CreditCard className="h-[22px] w-[22px] text-[#16B24B]" />
            </span>
            <span className="text-[12.5px] font-extrabold text-zinc-900">Kredi / Banka Kartı</span>
          </div>
          <p className={`mb-2.5 text-xs leading-snug ${cardSimOk ? 'font-semibold text-emerald-700' : 'font-medium text-zinc-600'}`}>
            {cardSimOk
              ? 'Simüle ödeme onaylandı; siparişi oluşturabilirsiniz.'
              : '“Teslimatı oluştur” dediğinizde banka ve 3D Secure simülasyonu açılır.'}
          </p>
          {quoteLoading ? (
            <DeliveryVatSummary pricing={null} loading />
          ) : quotePricing ? (
            <DeliveryVatSummary pricing={quotePricing} />
          ) : quoteErr ? (
            <p className="mt-2 text-[13px] font-semibold text-red-700">{quoteErr}</p>
          ) : (
            <p className="text-xs font-medium text-zinc-500">
              {canQuote ? 'Hesaplanıyor…' : 'Adres ve araç seçildikten sonra fiyat görünür'}
            </p>
          )}
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
          queueMicrotask(() => void submit());
        }}
      />
    </>
  );
}
