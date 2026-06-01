'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bike, Car, Check, CheckCircle2, KeyRound, Loader2, Send, Smartphone, UserRound } from 'lucide-react';
import {
  AuthErrorAlert,
  AuthField,
  AuthFooterLink,
  AuthOutlineButton,
  AuthPageHero,
  AuthPrimaryButton,
  AuthSectionCard,
  AuthTypeChip,
  authFieldClass,
} from '@/components/customer/auth-ui';
import { AppStoreBadges } from '@/components/marketing/AppStoreBadges';
import { CourierLegalDocumentModal } from '@/components/courier/CourierLegalDocumentModal';
import { cn } from '@/lib/cn';
import { PUBLIC_BRAND_QUERY_KEY, fetchPublicBrand } from '@/lib/brand-public';
import { COURIER_REGISTRATION_LEGAL_LINKS } from '@/lib/courier-register-consents';
import { publicApiPost } from '@/lib/public-api';
import { formatPlateInput, isValidTurkishPlate } from '@/lib/tr-plate';
import {
  defaultCourierBirthDateValue,
  formatYmd,
  isAtLeastYearsOld,
  isValidTCKimlikNo,
  isValidTurkishVKN,
  maxBirthDateInputValue,
} from '@/lib/tr-identifiers';

type CourierTypeApi = 'INDIVIDUAL' | 'MERCHANT';
type VehicleTypeApi = 'MOTORCYCLE' | 'CAR';
type MerchantCompanyTypeApi = 'SOLE_PROPRIETORSHIP' | 'JOINT_STOCK' | 'LIMITED';

type SendSmsRes = {
  ok: true;
  expiresAt: string;
  phone?: string;
  simulatedOtp?: string;
  simulationNotice?: string;
};

type RegisterRes = {
  accessToken: string;
  user: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    courierPublicId: string;
  };
};

const LEGAL = COURIER_REGISTRATION_LEGAL_LINKS;

const REGISTER_STEPS = ['Hesap türü', 'Kişisel bilgiler', 'Telefon', 'Giriş'] as const;

const COMPANY_OPTIONS: { value: MerchantCompanyTypeApi; label: string }[] = [
  { value: 'SOLE_PROPRIETORSHIP', label: 'Şahıs' },
  { value: 'JOINT_STOCK', label: 'A.Ş' },
  { value: 'LIMITED', label: 'Limited' },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <AuthField label={label}>{children}</AuthField>;
}

export function CourierRegisterClient() {
  const brandQ = useQuery({
    queryKey: PUBLIC_BRAND_QUERY_KEY,
    queryFn: fetchPublicBrand,
    staleTime: 120_000,
  });

  const [courierType, setCourierType] = useState<CourierTypeApi>('INDIVIDUAL');
  const [merchantCompanyType, setMerchantCompanyType] =
    useState<MerchantCompanyTypeApi>('SOLE_PROPRIETORSHIP');
  const [vehicleType, setVehicleType] = useState<VehicleTypeApi>('MOTORCYCLE');
  const [plate, setPlate] = useState('');

  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [sendRes, setSendRes] = useState<SendSmsRes | null>(null);
  const [sendingSms, setSendingSms] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tcKimlikNo, setTcKimlikNo] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [birthDate, setBirthDate] = useState(defaultCourierBirthDateValue);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [legalSlug, setLegalSlug] = useState<string | null>(null);
  const [done, setDone] = useState<RegisterRes['user'] | null>(null);

  const needsCompanyTax = useMemo(
    () =>
      courierType === 'MERCHANT' &&
      (merchantCompanyType === 'JOINT_STOCK' || merchantCompanyType === 'LIMITED'),
    [courierType, merchantCompanyType],
  );

  useEffect(() => {
    if (sendRes?.simulatedOtp) {
      setSmsCode(sendRes.simulatedOtp);
    }
  }, [sendRes?.simulatedOtp]);

  const onCourierTypeChange = useCallback((value: CourierTypeApi) => {
    setCourierType(value);
    if (value === 'INDIVIDUAL') {
      setTaxNumber('');
    } else {
      setMerchantCompanyType('SOLE_PROPRIETORSHIP');
      setTaxNumber('');
    }
  }, []);

  const onSendSms = useCallback(async () => {
    setErr(null);
    setSendRes(null);
    setSmsCode('');
    const p = phone.replace(/\s|-/g, '').trim();
    if (p.length < 10) {
      setErr('Cep telefonu numaranızı girin.');
      return;
    }
    setSendingSms(true);
    try {
      const res = await publicApiPost<SendSmsRes>('/auth/courier/register/send-sms', { phone: p });
      setSendRes(res);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSendingSms(false);
    }
  }, [phone]);

  const onRegister = useCallback(async () => {
    setErr(null);
    const p = phone.replace(/\s|-/g, '').trim();
    if (!sendRes) {
      setErr('Önce telefonunuza doğrulama kodu gönderin.');
      return;
    }
    if (!/^\d{6}$/.test(smsCode.replace(/\D/g, ''))) {
      setErr('6 haneli doğrulama kodunu girin.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErr('Ad ve soyad zorunludur.');
      return;
    }

    const tc = tcKimlikNo.replace(/\D/g, '');
    if (tc.length !== 11) {
      setErr('T.C. Kimlik numarası 11 hane olmalıdır.');
      return;
    }
    if (!isValidTCKimlikNo(tc)) {
      setErr('T.C. Kimlik numarası geçersiz.');
      return;
    }

    const birth = new Date(`${birthDate}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(birth.getTime()) || birth >= today) {
      setErr('Geçerli bir doğum tarihi seçin.');
      return;
    }
    if (!isAtLeastYearsOld(birth, 18)) {
      setErr('Kayıt için en az 18 yaşında olmalısınız.');
      return;
    }

    if (needsCompanyTax) {
      const tax = taxNumber.replace(/\D/g, '');
      if (tax.length !== 10) {
        setErr('Vergi kimlik numarası 10 hane olmalıdır.');
        return;
      }
      if (!isValidTurkishVKN(tax)) {
        setErr('Vergi kimlik numarası geçersiz.');
        return;
      }
    }

    if (!email.trim()) {
      setErr('E-posta zorunludur.');
      return;
    }
    if (password.length < 8) {
      setErr('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== passwordConfirm) {
      setErr('Şifreler eşleşmiyor. Lütfen aynı şifreyi iki alana da girin.');
      return;
    }
    if (!acceptedTerms) {
      setErr('Devam etmek için sözleşmeleri kabul edin.');
      return;
    }

    const plateTrimmed = plate.trim();
    if (!plateTrimmed) {
      setErr('Plaka zorunludur.');
      return;
    }
    if (!isValidTurkishPlate(plateTrimmed)) {
      setErr('Geçersiz plaka formatı (ör. 34 ABC 123).');
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        phone: p,
        smsCode: smsCode.replace(/\D/g, '').slice(0, 6),
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tcKimlikNo: tc,
        birthDate: formatYmd(birth),
        type: courierType,
        vehicleType,
        plate: plateTrimmed,
        acceptedTerms: true,
        marketingOptIn,
      };

      if (courierType === 'MERCHANT') {
        body.merchantCompanyType = merchantCompanyType;
        if (needsCompanyTax) {
          body.taxNumber = taxNumber.replace(/\D/g, '');
        }
      }

      const res = await publicApiPost<RegisterRes>('/auth/courier/register', body);
      setDone(res.user);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    sendRes,
    smsCode,
    phone,
    firstName,
    lastName,
    tcKimlikNo,
    taxNumber,
    birthDate,
    email,
    password,
    passwordConfirm,
    courierType,
    merchantCompanyType,
    needsCompanyTax,
    vehicleType,
    plate,
    acceptedTerms,
    marketingOptIn,
  ]);

  if (done) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2} aria-hidden />
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900">Kayıt tamamlandı</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
            Hesabınız oluşturuldu. <strong>Point Kurye</strong> mobil uygulamasından giriş yaparak
            sistem yöneticisinin talep ettiği evrakları yükleyin ve onaya gönderin. Onaylandıktan sonra
            teslimat almaya başlayabilirsiniz.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 text-center shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Kurye kodunuz</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-brand">{done.courierPublicId}</p>
          <p className="mt-3 text-sm text-zinc-600">{done.email}</p>
        </section>

        <AppStoreBadges
          className="flex flex-wrap items-center justify-center gap-4"
          appStoreUrl={brandQ.data?.appStoreUrl ?? null}
          googlePlayUrl={brandQ.data?.googlePlayUrl ?? null}
        />

        <p className="text-center text-sm text-zinc-500">
          Uygulamada aynı e-posta ve şifre ile giriş yapın. Onay verilmezse red nedeni hesabınızda
          görüntülenir.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AuthPageHero
        badge="Yeni kurye"
        title="Sürücü kayıt"
        description="Mobil uygulamayla aynı adımlar: hesap türü, araç bilgisi, doğrulama ve giriş bilgileri."
        icon={Bike}
      />

      <nav
        className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-3 shadow-sm backdrop-blur-sm"
        aria-label="Kayıt adımları"
      >
        {REGISTER_STEPS.map((label, i) => (
          <span
            key={label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
              i === 0
                ? 'border-brand/35 bg-brand/10 text-brand'
                : 'border-zinc-200/80 bg-white text-zinc-500',
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/10 text-[10px]">
              {i + 1}
            </span>
            {label}
          </span>
        ))}
      </nav>

      <AuthSectionCard title="Hesap türü" subtitle="Nasıl çalışacağınızı ve aracınızı seçin" icon={Bike} step={1}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <AuthTypeChip
            label="Bireysel"
            selected={courierType === 'INDIVIDUAL'}
            onClick={() => onCourierTypeChange('INDIVIDUAL')}
            disabled={loading}
          />
          <AuthTypeChip
            label="Esnaf"
            selected={courierType === 'MERCHANT'}
            onClick={() => onCourierTypeChange('MERCHANT')}
            disabled={loading}
          />
        </div>

        {courierType === 'MERCHANT' ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Şirket tipi</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMPANY_OPTIONS.map((opt) => (
                <AuthTypeChip
                  key={opt.value}
                  label={opt.label}
                  selected={merchantCompanyType === opt.value}
                  onClick={() => {
                    setMerchantCompanyType(opt.value);
                    if (opt.value === 'SOLE_PROPRIETORSHIP') setTaxNumber('');
                  }}
                  disabled={loading}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Araç</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={loading}
              onClick={() => setVehicleType('MOTORCYCLE')}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                vehicleType === 'MOTORCYCLE'
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-zinc-200/90 bg-white text-zinc-700 hover:border-brand/35',
                loading && 'opacity-60',
              )}
            >
              <Bike className="h-4 w-4 shrink-0" aria-hidden />
              Motosiklet
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setVehicleType('CAR')}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                vehicleType === 'CAR'
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-zinc-200/90 bg-white text-zinc-700 hover:border-brand/35',
                loading && 'opacity-60',
              )}
            >
              <Car className="h-4 w-4 shrink-0" aria-hidden />
              Araç
            </button>
          </div>
        </div>

        <Field label="Plaka">
          <input
            value={plate}
            onChange={(e) => setPlate(formatPlateInput(e.target.value))}
            className={authFieldClass}
            placeholder="34 ABC 123"
            maxLength={13}
            autoCapitalize="characters"
            disabled={loading}
          />
        </Field>
      </AuthSectionCard>

      <AuthSectionCard
        title="Kişisel bilgiler"
        subtitle="18 yaşından büyük olmalısınız. Şirket hesabında da kendi bilgilerinizi girin."
        icon={UserRound}
        step={2}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={authFieldClass}
              autoComplete="given-name"
              disabled={loading}
            />
          </Field>
          <Field label="Soyad">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={authFieldClass}
              autoComplete="family-name"
              disabled={loading}
            />
          </Field>
        </div>

        <Field label="T.C. Kimlik no">
          <input
            value={tcKimlikNo}
            onChange={(e) => setTcKimlikNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
            inputMode="numeric"
            maxLength={11}
            className={authFieldClass}
            disabled={loading}
          />
        </Field>

        <Field label="Doğum tarihi">
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={maxBirthDateInputValue()}
            className={authFieldClass}
            disabled={loading}
          />
        </Field>

        {needsCompanyTax ? (
          <Field label="Vergi kimlik no (VKN)">
            <input
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              className={authFieldClass}
              disabled={loading}
            />
          </Field>
        ) : null}
      </AuthSectionCard>

      <AuthSectionCard
        title="Telefon doğrulama"
        subtitle="Hesabınızı cep telefonu ile doğrulayın"
        icon={Smartphone}
        step={3}
      >
        <Field label="Cep telefonu">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="5xx xxx xx xx"
            className={authFieldClass}
            disabled={loading || sendingSms}
          />
        </Field>

        <AuthOutlineButton disabled={sendingSms || loading} onClick={() => void onSendSms()}>
          {sendingSms ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Gönderiliyor…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 shrink-0" aria-hidden />
              {sendRes ? 'Kodu yeniden gönder' : 'Doğrulama kodu gönder'}
            </>
          )}
        </AuthOutlineButton>

        {sendRes ? (
          <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 to-transparent px-4 py-3 text-sm">
            <p className="font-semibold text-brand">Kod telefonunuza gönderildi</p>
            {sendRes.simulatedOtp ? (
              <p className="mt-1 text-xs text-zinc-600">
                Test ortamı kodu: <span className="font-mono font-semibold">{sendRes.simulatedOtp}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <Field label="Doğrulama kodu">
          <input
            value={smsCode}
            onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            placeholder="6 haneli kod"
            className={cn(authFieldClass, 'text-center text-lg font-bold tracking-[0.35em]')}
            disabled={loading}
          />
        </Field>
      </AuthSectionCard>

      <AuthSectionCard
        title="Giriş bilgileri"
        subtitle="Uygulamaya bu bilgilerle giriş yapacaksınız"
        icon={KeyRound}
        step={4}
      >
        <Field label="E-posta">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={authFieldClass}
            disabled={loading}
          />
        </Field>
        <Field label="Şifre">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 8 karakter"
            autoComplete="new-password"
            className={authFieldClass}
            disabled={loading}
          />
        </Field>
        <Field label="Şifre tekrar">
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Şifrenizi tekrar girin"
            autoComplete="new-password"
            className={authFieldClass}
            disabled={loading}
          />
        </Field>
      </AuthSectionCard>

      <section className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm sm:p-6">
        <label className="flex cursor-pointer items-start gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={acceptedTerms}
            onClick={() => setAcceptedTerms((v) => !v)}
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition',
              acceptedTerms ? 'border-brand bg-brand text-white shadow-sm' : 'border-zinc-300 bg-white',
            )}
          >
            {acceptedTerms ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
          </button>
          <span className="text-sm leading-relaxed text-zinc-600">
            <button
              type="button"
              onClick={() => setLegalSlug(LEGAL[0].slug)}
              className="font-semibold text-brand hover:underline"
            >
              {LEGAL[0].label}
            </button>
            {', '}
            <button
              type="button"
              onClick={() => setLegalSlug(LEGAL[1].slug)}
              className="font-semibold text-brand hover:underline"
            >
              {LEGAL[1].label}
            </button>
            {' ve diğer sözleşmeleri kabul ediyorum.'}
          </span>
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={marketingOptIn}
            onClick={() => setMarketingOptIn((v) => !v)}
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition',
              marketingOptIn ? 'border-brand bg-brand text-white shadow-sm' : 'border-zinc-300 bg-white',
            )}
          >
            {marketingOptIn ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
          </button>
          <span className="text-sm text-zinc-600">Bildirim ve duyuruları almak istiyorum (isteğe bağlı)</span>
        </label>
      </section>

      {err ? <AuthErrorAlert message={err} /> : null}

      <AuthPrimaryButton disabled={loading} onClick={() => void onRegister()}>
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Kayıt olunuyor…
          </span>
        ) : (
          'Kayıt ol'
        )}
      </AuthPrimaryButton>

      <AuthFooterLink>
        Zaten hesabınız var mı? Point Kurye mobil uygulamasından giriş yapın.
      </AuthFooterLink>

      <CourierLegalDocumentModal slug={legalSlug} open={legalSlug != null} onClose={() => setLegalSlug(null)} />
    </div>
  );
}
