'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Building2, Check, KeyRound, Loader2, Send, Smartphone, UserRound } from 'lucide-react';
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
  authTextareaClass,
} from '@/components/customer/auth-ui';
import { LegalDocumentModal } from '@/components/customer/LegalDocumentModal';
import { cn } from '@/lib/cn';
import { redirectToCustomerPanelWithHandoff } from '@/lib/customer-handoff';
import { publicApiPost } from '@/lib/public-api';
import { REGISTRATION_LEGAL_LINKS } from '@/lib/register-consents';
import { isValidTCKimlikNo, isValidTurkishVKN } from '@/lib/tr-identifiers';

type CustomerTypeApi = 'INDIVIDUAL' | 'CORPORATE' | 'SOLE_PROPRIETOR';

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
    customerPublicId: string;
  };
};

const LEGAL = REGISTRATION_LEGAL_LINKS;

const TYPE_OPTIONS: { value: CustomerTypeApi; label: string }[] = [
  { value: 'INDIVIDUAL', label: 'Bireysel' },
  { value: 'SOLE_PROPRIETOR', label: 'Şahıs' },
  { value: 'CORPORATE', label: 'Kurumsal' },
];

const REGISTER_STEPS = ['Hesap türü', 'Bilgiler', 'Telefon', 'Giriş'] as const;

function nextFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('next');
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <AuthField label={label}>{children}</AuthField>;
}

export function CustomerRegisterClient() {
  const [loginHref, setLoginHref] = useState('/musteri/giris');

  const [customerType, setCustomerType] = useState<CustomerTypeApi>('INDIVIDUAL');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [sendRes, setSendRes] = useState<SendSmsRes | null>(null);
  const [sendingSms, setSendingSms] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [tcKimlikNo, setTcKimlikNo] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [legalSlug, setLegalSlug] = useState<string | null>(null);

  const isCorporate = customerType === 'CORPORATE';
  const isSoleProprietor = customerType === 'SOLE_PROPRIETOR';
  const needsTc = customerType === 'INDIVIDUAL' || isSoleProprietor || isCorporate;
  const needsTaxNumber = isSoleProprietor || isCorporate;
  const needsTaxOffice = isSoleProprietor || isCorporate;
  const needsBillingAddress = isSoleProprietor || isCorporate;

  const infoSubtitle = isCorporate
    ? 'Yetkili kişi adı ve şirket bilgileri'
    : 'Teslimat ve fatura işlemleri için kullanılır';

  useEffect(() => {
    const q = window.location.search;
    setLoginHref(q ? `/musteri/giris${q}` : '/musteri/giris');
  }, []);

  useEffect(() => {
    if (sendRes?.simulatedOtp) {
      setSmsCode(sendRes.simulatedOtp);
    }
  }, [sendRes?.simulatedOtp]);

  const onCustomerTypeChange = useCallback((value: CustomerTypeApi) => {
    setCustomerType(value);
    if (value === 'CORPORATE') {
      setTcKimlikNo('');
    } else {
      setCompanyName('');
      setTaxNumber('');
    }
    setTaxOffice('');
    setBillingAddress('');
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
      const res = await publicApiPost<SendSmsRes>('/auth/customer/register/send-sms', { phone: p });
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

    const tc = tcKimlikNo.replace(/\D/g, '');
    const tax = taxNumber.replace(/\D/g, '');

    if (isCorporate && !companyName.trim()) {
      setErr('Şirket ünvanı zorunludur.');
      return;
    }

    if (needsTaxNumber) {
      if (tax.length !== 10) {
        setErr('Vergi kimlik numarası 10 hane olmalıdır.');
        return;
      }
      if (!isValidTurkishVKN(tax)) {
        setErr('Vergi kimlik numarası geçersiz.');
        return;
      }
    }

    if (needsTc) {
      if (tc.length !== 11) {
        setErr('T.C. Kimlik numarası 11 hane olmalıdır.');
        return;
      }
      if (!isValidTCKimlikNo(tc)) {
        setErr('T.C. Kimlik numarası geçersiz.');
        return;
      }
    }

    if (needsTaxOffice) {
      const office = taxOffice.trim();
      if (!office) {
        setErr('Vergi dairesi zorunludur.');
        return;
      }
      if (office.length < 2) {
        setErr('Vergi dairesi en az 2 karakter olmalıdır.');
        return;
      }
    }

    if (needsBillingAddress) {
      const address = billingAddress.trim();
      if (!address) {
        setErr('Fatura adresi zorunludur.');
        return;
      }
      if (address.length < 10) {
        setErr('Fatura adresi en az 10 karakter olmalıdır.');
        return;
      }
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
        customerType,
        acceptedTerms: true,
        marketingOptIn,
      };
      if (isCorporate) {
        body.companyName = companyName.trim();
        body.taxNumber = tax;
        body.tcKimlikNo = tc;
        body.taxOffice = taxOffice.trim();
        body.billingAddress = billingAddress.trim();
      } else if (isSoleProprietor) {
        body.tcKimlikNo = tc;
        body.taxNumber = tax;
        body.taxOffice = taxOffice.trim();
        body.billingAddress = billingAddress.trim();
      } else {
        body.tcKimlikNo = tc;
      }

      const res = await publicApiPost<RegisterRes>('/auth/customer/register', body);
      await redirectToCustomerPanelWithHandoff(res.accessToken, nextFromUrl());
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
    email,
    password,
    passwordConfirm,
    customerType,
    companyName,
    taxNumber,
    taxOffice,
    billingAddress,
    tcKimlikNo,
    needsTaxNumber,
    needsTaxOffice,
    needsBillingAddress,
    isSoleProprietor,
    acceptedTerms,
    marketingOptIn,
    needsTc,
    isCorporate,
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AuthPageHero
        badge="Yeni müşteri"
        title="Kayıt ol"
        description="Mobil uygulamayla aynı adımlar: hesap türü, doğrulama ve giriş bilgileri. Birkaç dakikada panele erişin."
        icon={UserRound}
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

      <AuthSectionCard title="Hesap türü" subtitle="Size uygun müşteri tipini seçin" icon={Building2} step={1}>
        <div className="flex flex-col gap-2 sm:flex-row">
          {TYPE_OPTIONS.map((opt) => (
            <AuthTypeChip
              key={opt.value}
              label={opt.label}
              selected={customerType === opt.value}
              onClick={() => onCustomerTypeChange(opt.value)}
              disabled={loading}
            />
          ))}
        </div>
      </AuthSectionCard>

      <AuthSectionCard
        title={isCorporate ? 'İletişim ve şirket' : 'Kişisel bilgiler'}
        subtitle={infoSubtitle}
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

          {isCorporate ? (
            <Field label="Şirket ünvanı">
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={authFieldClass}
                disabled={loading}
              />
            </Field>
          ) : null}

          {needsTc ? (
            <Field label={isCorporate ? 'Yetkili T.C. Kimlik no' : 'T.C. Kimlik no'}>
              <input
                value={tcKimlikNo}
                onChange={(e) => setTcKimlikNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
                maxLength={11}
                className={authFieldClass}
                disabled={loading}
              />
            </Field>
          ) : null}

          {needsTaxNumber ? (
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

          {needsTaxOffice ? (
            <Field label="Vergi dairesi">
              <input
                value={taxOffice}
                onChange={(e) => setTaxOffice(e.target.value)}
                placeholder="Örn. Kadıköy"
                maxLength={120}
                className={authFieldClass}
                disabled={loading}
              />
            </Field>
          ) : null}

          {needsBillingAddress ? (
            <Field label="Fatura adresi">
              <textarea
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Mahalle, sokak, bina no, ilçe, il"
                maxLength={500}
                rows={4}
                className={authTextareaClass}
                disabled={loading}
              />
            </Field>
          ) : null}
      </AuthSectionCard>

      <AuthSectionCard title="Telefon doğrulama" subtitle="Hesabınızı cep telefonu ile doğrulayın" icon={Smartphone} step={3}>
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

      <AuthSectionCard title="Giriş bilgileri" subtitle="Panele bu bilgilerle giriş yapacaksınız" icon={KeyRound} step={4}>
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
              <button type="button" onClick={() => setLegalSlug(LEGAL[0].slug)} className="font-semibold text-brand hover:underline">
                {LEGAL[0].label}
              </button>
              {', '}
              <button type="button" onClick={() => setLegalSlug(LEGAL[1].slug)} className="font-semibold text-brand hover:underline">
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
            <span className="text-sm text-zinc-600">Kampanya ve duyuruları almak istiyorum (isteğe bağlı)</span>
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
        Zaten hesabınız var mı?{' '}
        <Link href={loginHref} className="font-semibold text-brand hover:underline">
          Giriş yap
        </Link>
      </AuthFooterLink>

      <LegalDocumentModal slug={legalSlug} open={legalSlug != null} onClose={() => setLegalSlug(null)} />
    </div>
  );
}
