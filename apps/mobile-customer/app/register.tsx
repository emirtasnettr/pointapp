import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Check, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LegalDocumentModal } from '../components/LegalDocumentModal';
import { apiPost } from '../lib/api';
import { REGISTRATION_LEGAL_LINKS } from '../lib/register-consents';
import { routeCustomerAfterAuth } from '../lib/notification-settings';
import { setCustomerSession } from '../lib/session';
import { customerTheme as t } from '../lib/theme';
import { isValidTCKimlikNo, isValidTurkishVKN } from '../lib/tr-identifiers';

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
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function LabeledInput({
  label,
  last,
  ...inputProps
}: { label: string; last?: boolean } & TextInputProps) {
  return (
    <View style={[styles.fieldWrap, last && styles.fieldWrapLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={t.inkSoft} style={styles.input} {...inputProps} />
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
  const needsTc =
    customerType === 'INDIVIDUAL' || isSoleProprietor || isCorporate;
  const needsTaxNumber = isSoleProprietor || isCorporate;
  const needsTaxOffice = isSoleProprietor || isCorporate;
  const needsBillingAddress = isSoleProprietor || isCorporate;

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
      const res = await apiPost<SendSmsRes>('/auth/customer/register/send-sms', { phone: p });
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

      const res = await apiPost<RegisterRes>('/auth/customer/register', body);
      await setCustomerSession({
        accessToken: res.accessToken,
        email: res.user.email,
        customerPublicId: res.user.customerPublicId,
      });
      await routeCustomerAfterAuth(router);
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
    router,
  ]);

  const infoSubtitle = isCorporate
    ? 'Yetkili kişi adı ve şirket bilgileri'
    : 'Teslimat ve fatura işlemleri için kullanılır';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormCard title="Hesap türü" subtitle="Size uygun müşteri tipini seçin">
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((opt) => {
              const on = customerType === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onCustomerTypeChange(opt.value)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </FormCard>

        <FormCard title={isCorporate ? 'İletişim ve şirket' : 'Kişisel bilgiler'} subtitle={infoSubtitle}>
          <View style={styles.nameRow}>
            <View style={styles.nameCol}>
              <LabeledInput
                label="Ad"
                value={firstName}
                onChangeText={setFirstName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.nameCol}>
              <LabeledInput
                label="Soyad"
                value={lastName}
                onChangeText={setLastName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>
          </View>

          {isCorporate ? (
            <LabeledInput
              label="Şirket ünvanı"
              value={companyName}
              onChangeText={setCompanyName}
              editable={!loading}
            />
          ) : null}

          {needsTc ? (
            <LabeledInput
              label={isCorporate ? 'Yetkili T.C. Kimlik no' : 'T.C. Kimlik no'}
              value={tcKimlikNo}
              onChangeText={(x) => setTcKimlikNo(x.replace(/\D/g, '').slice(0, 11))}
              keyboardType="number-pad"
              maxLength={11}
              editable={!loading}
            />
          ) : null}

          {needsTaxNumber ? (
            <LabeledInput
              label="Vergi kimlik no (VKN)"
              value={taxNumber}
              onChangeText={(x) => setTaxNumber(x.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              editable={!loading}
            />
          ) : null}

          {needsTaxOffice ? (
            <LabeledInput
              label="Vergi dairesi"
              value={taxOffice}
              onChangeText={setTaxOffice}
              editable={!loading}
              placeholder="Örn. Kadıköy"
              maxLength={120}
            />
          ) : null}

          {needsBillingAddress ? (
            <LabeledInput
              label="Fatura adresi"
              value={billingAddress}
              onChangeText={setBillingAddress}
              editable={!loading}
              placeholder="Mahalle, sokak, bina no, ilçe, il"
              maxLength={500}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[styles.input, styles.addressInput]}
              last
            />
          ) : null}
        </FormCard>

        <FormCard title="Telefon doğrulama" subtitle="Hesabınızı cep telefonu ile doğrulayın">
          <LabeledInput
            label="Cep telefonu"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading && !sendingSms}
            placeholder="5xx xxx xx xx"
          />

          <Pressable
            style={[styles.outlineBtn, (sendingSms || loading) && styles.btnDis]}
            onPress={() => void onSendSms()}
            disabled={sendingSms || loading}
          >
            {sendingSms ? (
              <ActivityIndicator color={t.brand} />
            ) : (
              <>
                <Send color={t.brand} size={17} strokeWidth={2.2} />
                <Text style={styles.outlineBtnTxt}>
                  {sendRes ? 'Kodu yeniden gönder' : 'Doğrulama kodu gönder'}
                </Text>
              </>
            )}
          </Pressable>

          {sendRes ? (
            <View style={styles.smsOk}>
              <Text style={styles.smsOkTxt}>Kod telefonunuza gönderildi</Text>
              {sendRes.simulatedOtp ? (
                <Text style={styles.smsDemo}>Test kodu: {sendRes.simulatedOtp}</Text>
              ) : null}
            </View>
          ) : null}

          <LabeledInput
            label="Doğrulama kodu"
            value={smsCode}
            onChangeText={(x) => setSmsCode(x.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
            placeholder="6 haneli kod"
            style={[styles.input, styles.otpInput]}
            last
          />
        </FormCard>

        <FormCard title="Giriş bilgileri" subtitle="Uygulamaya bu bilgilerle giriş yapacaksınız">
          <LabeledInput
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          <LabeledInput
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            placeholder="En az 8 karakter"
          />
          <LabeledInput
            label="Şifre tekrar"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
            editable={!loading}
            placeholder="Şifrenizi tekrar girin"
            last
          />
        </FormCard>

        <View style={styles.card}>
          <View style={styles.consentRow}>
            <Pressable
              onPress={() => setAcceptedTerms((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              hitSlop={8}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}>
                {acceptedTerms ? <Check color={t.onBrand} size={16} strokeWidth={3} /> : null}
              </View>
            </Pressable>
            <Text style={styles.consentText}>
              <Text onPress={() => setLegalSlug(LEGAL[0].slug)} style={styles.consentLink}>
                {LEGAL[0].label}
              </Text>
              <Text>, </Text>
              <Text onPress={() => setLegalSlug(LEGAL[1].slug)} style={styles.consentLink}>
                {LEGAL[1].label}
              </Text>
              <Text> ve diğer sözleşmeleri kabul ediyorum.</Text>
            </Text>
          </View>

          <View style={[styles.consentRow, styles.consentOptional]}>
            <Pressable
              onPress={() => setMarketingOptIn((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marketingOptIn }}
              hitSlop={8}
            >
              <View style={[styles.checkbox, marketingOptIn && styles.checkboxOn]}>
                {marketingOptIn ? <Check color={t.onBrand} size={16} strokeWidth={3} /> : null}
              </View>
            </Pressable>
            <Text style={styles.consentText}>
              Kampanya ve duyuruları almak istiyorum (isteğe bağlı)
            </Text>
          </View>
        </View>

        {err ? (
          <View style={styles.errBox} accessibilityRole="alert">
            <AlertCircle color={t.danger} size={18} strokeWidth={2} />
            <Text style={styles.err}>{err}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => void onRegister()}
          disabled={loading}
          style={({ pressed }) => [styles.submitOuter, pressed && !loading && styles.submitPress]}
        >
          <LinearGradient
            colors={['#3edd7a', t.brand, '#129a40']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.submitGrad, loading && styles.btnDis]}
          >
            {loading ? (
              <ActivityIndicator color={t.onBrand} />
            ) : (
              <Text style={styles.submitTxt}>Kayıt ol</Text>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backTxt}>Zaten hesabım var — Giriş yap</Text>
        </Pressable>
      </ScrollView>

      <LegalDocumentModal
        slug={legalSlug}
        visible={legalSlug != null}
        onClose={() => setLegalSlug(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  card: {
    backgroundColor: t.surface,
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    ...t.shadow,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: t.ink, letterSpacing: -0.2 },
  cardSub: { marginTop: 4, marginBottom: 14, fontSize: 13, lineHeight: 19, color: t.inkMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surfaceMuted,
  },
  chipOn: { borderColor: t.brand, backgroundColor: t.brandMuted },
  chipTxt: { fontSize: 14, fontWeight: '600', color: t.inkSecondary },
  chipTxtOn: { color: t.brand, fontWeight: '800' },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameCol: { flex: 1 },
  fieldWrap: { marginBottom: 12 },
  fieldWrapLast: { marginBottom: 0 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: t.inkSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: t.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: t.ink,
    backgroundColor: t.surfaceMuted,
  },
  addressInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  otpInput: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: t.radiusMd,
    borderWidth: 1,
    borderColor: t.brandBorder,
    backgroundColor: t.brandMuted,
  },
  outlineBtnTxt: { color: t.brand, fontWeight: '700', fontSize: 14 },
  smsOk: {
    marginBottom: 12,
    padding: 10,
    borderRadius: t.radiusSm,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  smsOkTxt: { fontSize: 13, fontWeight: '600', color: t.brand },
  smsDemo: { marginTop: 4, fontSize: 12, color: t.inkMuted },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  consentOptional: { marginTop: 14 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: t.brand, borderColor: t.brand },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20, color: t.inkSecondary },
  consentLink: { color: t.brand, fontWeight: '700', textDecorationLine: 'underline' },
  errBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: t.radiusMd,
    backgroundColor: t.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.12)',
  },
  err: { flex: 1, color: t.danger, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  submitOuter: { borderRadius: 999, overflow: 'hidden', marginTop: 4 },
  submitPress: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  submitGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { color: t.onBrand, fontSize: 17, fontWeight: '800' },
  btnDis: { opacity: 0.75 },
  back: { alignItems: 'center', paddingVertical: 14 },
  backTxt: { fontSize: 15, fontWeight: '700', color: t.brand },
});
