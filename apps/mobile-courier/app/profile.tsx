import { useCallback, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import {
  COURIER_TYPE_TR,
  fetchCourierProfile,
  formatConsentYesNo,
  formatProfileDate,
  USER_STATUS_TR,
  VEHICLE_TYPE_TR,
  type CourierProfile,
} from '../lib/courier-profile';
import { formatIbanInput } from '../lib/courier-bank';
import { courierTheme as t } from '../lib/theme';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldBox}>
        <Text style={styles.fieldValue} selectable>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      setProfile(await fetchCourierProfile());
    } catch (e) {
      setProfile(null);
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const ibanDisplay = profile?.iban ? formatIbanInput(profile.iban) : '—';

  return (
    <ScrollView contentContainerStyle={styles.box} showsVerticalScrollIndicator={false}>
      {loading ? (
        <ActivityIndicator color={t.brand} style={styles.loader} />
      ) : err ? (
        <View style={styles.card}>
          <Text style={styles.err}>{err}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryTxt}>Yenile</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <UserRound color={t.brand} size={36} strokeWidth={2} />
            </View>
            <Text style={styles.heroName}>
              {profile.accountHolderDisplay || profile.publicId}
            </Text>
            <Text style={styles.heroId}>{profile.publicId}</Text>
            <Text style={styles.heroStatus}>
              {USER_STATUS_TR[profile.user.status] ?? profile.user.status}
            </Text>
          </View>

          <Section title="Kişisel bilgiler">
            <Field label="Ad" value={profile.user.firstName} />
            <Field label="Soyad" value={profile.user.lastName} />
            <Field label="T.C. Kimlik No" value={profile.user.tcKimlikNo} />
            <Field label="Telefon" value={profile.user.phone} />
            <Field label="E-posta" value={profile.user.email ?? ''} />
            <Field
              label="Telefon doğrulama"
              value={profile.user.phoneVerifiedAt ? formatProfileDate(profile.user.phoneVerifiedAt) : 'Doğrulanmadı'}
            />
            <Field label="Son giriş" value={formatProfileDate(profile.user.lastLoginAt)} />
            <Field label="Üyelik tarihi" value={formatProfileDate(profile.user.memberSince)} />
          </Section>

          <Section title="Kurye bilgileri">
            <Field label="Kurye no" value={profile.publicId} />
            <Field label="Kurye tipi" value={COURIER_TYPE_TR[profile.type] ?? profile.type} />
            <Field label="Araç tipi" value={VEHICLE_TYPE_TR[profile.vehicleType] ?? profile.vehicleType} />
            <Field label="Plaka" value={profile.plate} />
            <Field label="Tamamlanan teslimat" value={`${profile.deliveredCount} adet`} />
            <Field label="Profil oluşturma" value={formatProfileDate(profile.createdAt)} />
            <Field label="Son güncelleme" value={formatProfileDate(profile.updatedAt)} />
          </Section>

          <Section title="Banka">
            <Field label="Hesap sahibi" value={profile.accountHolderDisplay} />
            <Field label="IBAN" value={ibanDisplay} />
            <Pressable style={styles.bankLink} onPress={() => router.push('/bank')}>
              <Text style={styles.bankLinkTxt}>IBAN düzenlemek için Banka bilgileri</Text>
            </Pressable>
          </Section>

          {profile.wallet ? (
            <Section title="Cüzdan">
              <Field
                label="Bakiye"
                value={`${profile.wallet.balance} ${profile.wallet.currency}`}
              />
              <Field
                label="Bekleyen"
                value={`${profile.wallet.pending} ${profile.wallet.currency}`}
              />
            </Section>
          ) : null}

          <Section title="Sözleşmeler">
            <Field
              label="Kayıt sözleşmesi"
              value={formatConsentYesNo(profile.consents.registrationTerms)}
            />
            {profile.consents.registrationTerms ? (
              <Field
                label="Sözleşme tarihi"
                value={formatProfileDate(profile.consents.registrationTerms.recordedAt)}
              />
            ) : null}
            <Field
              label="Pazarlama bildirimleri"
              value={formatConsentYesNo(profile.consents.marketingNotifications)}
            />
            {profile.consents.marketingNotifications ? (
              <Field
                label="Tercih tarihi"
                value={formatProfileDate(profile.consents.marketingNotifications.recordedAt)}
              />
            ) : null}
          </Section>

          <Text style={styles.footnote}>
            Ad, soyad ve T.C. Kimlik No yalnızca operasyon tarafından güncellenir.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { padding: 20, paddingBottom: 40, backgroundColor: t.bg },
  loader: { marginTop: 40 },
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
  hero: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: t.radiusLg,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    marginBottom: 8,
    ...t.shadow,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.brandMuted,
    borderWidth: 2,
    borderColor: t.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { marginTop: 12, color: t.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  heroId: { marginTop: 4, color: t.inkSecondary, fontSize: 13, fontWeight: '700' },
  heroStatus: {
    marginTop: 8,
    color: t.brand,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  section: { marginTop: 16 },
  sectionTitle: {
    marginBottom: 8,
    color: t.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  card: {
    padding: 14,
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    ...t.shadow,
  },
  field: { marginBottom: 12 },
  fieldLabel: { color: t.inkMuted, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  fieldBox: {
    backgroundColor: t.surfaceMuted,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: t.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  fieldValue: { color: t.ink, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  bankLink: { marginTop: 4, paddingVertical: 6 },
  bankLinkTxt: { color: t.brand, fontSize: 13, fontWeight: '700' },
  footnote: {
    marginTop: 16,
    color: t.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
