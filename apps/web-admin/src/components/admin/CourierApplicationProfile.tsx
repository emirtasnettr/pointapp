'use client';

import {
  COURIER_TYPE_TR,
  MERCHANT_COMPANY_TYPE_TR,
  ONBOARDING_STATUS_TR,
  USER_STATUS_TR,
  VEHICLE_TYPE_TR,
  formatAdminDate,
  formatAdminDateTime,
  type ApplicationDetail,
  type MerchantCompanyTypeApi,
} from '@/lib/courier-onboarding-admin';
import { GlassCard } from '@/components/admin/GlassCard';
import { cn } from '@/lib/cn';

function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2 lg:col-span-3' : undefined}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-sm text-zinc-800',
          mono && 'font-mono text-xs',
          full && 'whitespace-pre-wrap leading-relaxed',
        )}
      >
        {value || '—'}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{children}</h2>
  );
}

function consentLabel(snapshot: ApplicationDetail['consents']['registrationTerms']) {
  if (!snapshot) return 'Kayıt yok';
  return snapshot.granted ? 'Evet' : 'Hayır';
}

export function CourierApplicationProfile({ data }: { data: ApplicationDetail }) {
  const merchantLabel =
    data.profile.merchantCompanyType != null
      ? MERCHANT_COMPANY_TYPE_TR[data.profile.merchantCompanyType as MerchantCompanyTypeApi] ??
        data.profile.merchantCompanyType
      : null;

  return (
    <GlassCard className="mb-6 p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Kayıt bilgileri</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Kuryenin kayıt formunda girdiği tüm alanlar — inceleme öncesi doğrulama için.
      </p>

      <div className="mt-6 space-y-8">
        <div>
          <SectionTitle>Kişisel bilgiler</SectionTitle>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Ad" value={data.user.firstName ?? ''} />
            <Field label="Soyad" value={data.user.lastName ?? ''} />
            <Field label="T.C. Kimlik No" value={data.user.tcKimlikNo ?? ''} mono />
            <Field label="Doğum tarihi" value={formatAdminDate(data.user.birthDate)} />
            <Field label="E-posta" value={data.user.email ?? ''} full />
            <Field label="Telefon" value={data.user.phone} mono />
            <Field label="Telefon doğrulama" value={formatAdminDateTime(data.user.phoneVerifiedAt)} />
          </div>
        </div>

        <div>
          <SectionTitle>Kurye ve araç</SectionTitle>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Kurye kodu" value={data.publicId} mono />
            <Field label="Hesap türü" value={COURIER_TYPE_TR[data.profile.type]} />
            {data.profile.type === 'MERCHANT' ? (
              <Field label="Şirket tipi" value={merchantLabel ?? '—'} />
            ) : null}
            {data.profile.taxNumber ? (
              <Field label="Vergi kimlik no (VKN)" value={data.profile.taxNumber} mono />
            ) : null}
            <Field
              label="Araç tipi"
              value={VEHICLE_TYPE_TR[data.profile.vehicleType] ?? data.profile.vehicleType}
            />
            <Field label="Plaka" value={data.profile.plate ?? ''} mono />
            {data.profile.iban ? <Field label="IBAN" value={data.profile.iban} mono full /> : null}
          </div>
        </div>

        <div>
          <SectionTitle>Sözleşme ve izinler (kayıt anı)</SectionTitle>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Kayıt sözleşmeleri"
              value={consentLabel(data.consents.registrationTerms)}
            />
            <Field
              label="Pazarlama bildirimleri"
              value={consentLabel(data.consents.marketingNotifications)}
            />
            {data.consents.registrationTerms ? (
              <Field
                label="Sözleşme kayıt zamanı"
                value={formatAdminDateTime(data.consents.registrationTerms.recordedAt)}
              />
            ) : null}
            {data.consents.registrationTerms?.source ? (
              <Field label="Kayıt kaynağı" value={data.consents.registrationTerms.source} />
            ) : null}
          </div>
        </div>

        <div>
          <SectionTitle>Başvuru durumu</SectionTitle>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Hesap durumu"
              value={USER_STATUS_TR[data.user.status] ?? data.user.status}
            />
            <Field
              label="Onay süreci"
              value={ONBOARDING_STATUS_TR[data.account.onboardingStatus]}
            />
            <Field label="Kayıt tarihi" value={formatAdminDateTime(data.user.createdAt)} />
            <Field label="Profil oluşturma" value={formatAdminDateTime(data.profile.createdAt)} />
            <Field
              label="İncelemeye gönderim"
              value={formatAdminDateTime(data.submittedForReviewAt)}
            />
            <Field label="Son inceleme" value={formatAdminDateTime(data.reviewedAt)} />
            {data.reviewedBy ? (
              <Field
                label="İnceleyen"
                value={[data.reviewedBy.name, data.reviewedBy.email].filter(Boolean).join(' · ')}
                full
              />
            ) : null}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
