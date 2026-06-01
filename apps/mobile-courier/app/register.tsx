import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { AlertCircle, Bike, Car, Check, Phone, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LegalDocumentModal } from '../components/LegalDocumentModal';
import { apiPost } from '../lib/api';
import { COURIER_REGISTRATION_LEGAL_LINKS, routeCourierAfterAuth } from '../lib/courier-consents';
import { setCourierSession } from '../lib/session';
import { courierTheme as t } from '../lib/theme';
import {
  formatYmd,
  isAtLeastYearsOld,
  isValidTCKimlikNo,
  isValidTurkishVKN,
  maxBirthDateForMinAge,
} from '../lib/tr-identifiers';
import { formatPlateInput, isValidTurkishPlate } from '../lib/tr-plate';

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
const maxBirthDate = maxBirthDateForMinAge(18);

const defaultBirthDate = () => {
  const d = new Date(maxBirthDate);
  d.setFullYear(d.getFullYear() - 7);
  return d;
};

function formatBirthDisplay(d: Date): string {
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

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

function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            disabled={disabled}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Text style={[styles.segmentTxt, on && styles.segmentTxtOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
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
      <TextInput
        placeholderTextColor={t.inkSoft}
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
  const [birthDate, setBirthDate] = useState(defaultBirthDate);
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [legalSlug, setLegalSlug] = useState<string | null>(null);

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
      const res = await apiPost<SendSmsRes>('/auth/courier/register/send-sms', { phone: p });
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (birthDate >= today) {
      setErr('Geçerli bir doğum tarihi seçin.');
      return;
    }
    if (!isAtLeastYearsOld(birthDate, 18)) {
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
        birthDate: formatYmd(birthDate),
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

      const res = await apiPost<RegisterRes>('/auth/courier/register', body);
      await setCourierSession({
        accessToken: res.accessToken,
        email: res.user.email,
        courierPublicId: res.user.courierPublicId,
      });
      await routeCourierAfterAuth(router);
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
    router,
  ]);

  const companyOptions: { value: MerchantCompanyTypeApi; label: string }[] = [
    { value: 'SOLE_PROPRIETORSHIP', label: 'Şahıs' },
    { value: 'JOINT_STOCK', label: 'A.Ş' },
    { value: 'LIMITED', label: 'Limited' },
  ];

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
        <FormCard title="Hesap türü" subtitle="Nasıl çalışacağınızı seçin">
          <Segmented
            options={[
              { value: 'INDIVIDUAL', label: 'Bireysel' },
              { value: 'MERCHANT', label: 'Esnaf' },
            ]}
            value={courierType}
            onChange={onCourierTypeChange}
            disabled={loading}
          />

          {courierType === 'MERCHANT' ? (
            <View style={styles.blockGap}>
              <Text style={styles.fieldLabel}>Şirket tipi</Text>
              <View style={styles.chipRow}>
                {companyOptions.map((opt) => {
                  const on = merchantCompanyType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setMerchantCompanyType(opt.value);
                        if (opt.value === 'SOLE_PROPRIETORSHIP') setTaxNumber('');
                      }}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.blockGap}>
            <Text style={styles.fieldLabel}>Araç</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setVehicleType('MOTORCYCLE')}
                style={[styles.chipIcon, vehicleType === 'MOTORCYCLE' && styles.chipOn]}
              >
                <Bike color={vehicleType === 'MOTORCYCLE' ? t.brand : t.inkSoft} size={20} />
                <Text
                  style={[
                    styles.chipTxt,
                    vehicleType === 'MOTORCYCLE' && styles.chipTxtOn,
                  ]}
                >
                  Motosiklet
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setVehicleType('CAR')}
                style={[styles.chipIcon, vehicleType === 'CAR' && styles.chipOn]}
              >
                <Car color={vehicleType === 'CAR' ? t.brand : t.inkSoft} size={20} />
                <Text style={[styles.chipTxt, vehicleType === 'CAR' && styles.chipTxtOn]}>
                  Araç
                </Text>
              </Pressable>
            </View>
          </View>

          <LabeledInput
            label="Plaka"
            value={plate}
            onChangeText={(x) => setPlate(formatPlateInput(x))}
            autoCapitalize="characters"
            editable={!loading}
            placeholder="34 ABC 123"
            maxLength={13}
          />
        </FormCard>

        <FormCard
          title="Kişisel bilgiler"
          subtitle="18 yaşından büyük olmalısınız. Şirket hesabında da kendi bilgilerinizi girin."
        >
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

          <LabeledInput
            label="T.C. Kimlik no"
            value={tcKimlikNo}
            onChangeText={(x) => setTcKimlikNo(x.replace(/\D/g, '').slice(0, 11))}
            keyboardType="number-pad"
            maxLength={11}
            editable={!loading}
          />

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Doğum tarihi</Text>
            <Pressable
              style={styles.input}
              onPress={() => setShowBirthPicker(true)}
              disabled={loading}
            >
              <Text style={styles.dateValue}>{formatBirthDisplay(birthDate)}</Text>
            </Pressable>
          </View>
          {showBirthPicker ? (
            <DateTimePicker
              value={birthDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={maxBirthDate}
              onChange={(_, selected) => {
                if (Platform.OS === 'android') setShowBirthPicker(false);
                if (selected) setBirthDate(selected);
              }}
            />
          ) : null}
          {Platform.OS === 'ios' && showBirthPicker ? (
            <Pressable style={styles.pickerDone} onPress={() => setShowBirthPicker(false)}>
              <Text style={styles.pickerDoneTxt}>Tamam</Text>
            </Pressable>
          ) : null}

          {needsCompanyTax ? (
            <LabeledInput
              label="Vergi kimlik no (VKN)"
              value={taxNumber}
              onChangeText={(x) => setTaxNumber(x.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              editable={!loading}
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
            <Text style={styles.consentText}>Bildirim ve duyuruları almak istiyorum (isteğe bağlı)</Text>
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
  blockGap: { marginTop: 14 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: t.surfaceMuted,
    borderRadius: t.radiusMd,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: t.radiusSm,
    alignItems: 'center',
  },
  segmentOn: { backgroundColor: t.surface, ...t.shadow },
  segmentTxt: { fontSize: 15, fontWeight: '600', color: t.inkMuted },
  segmentTxtOn: { color: t.ink, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surfaceMuted,
  },
  chipOn: { borderColor: t.brand, backgroundColor: t.brandMuted },
  chipIcon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: t.radiusMd,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surfaceMuted,
    minWidth: '46%',
  },
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
  dateValue: { fontSize: 16, color: t.ink, fontWeight: '600' },
  pickerDone: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 4, padding: 8 },
  pickerDoneTxt: { color: t.brand, fontWeight: '700', fontSize: 15 },
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
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: t.brand, borderColor: t.brand },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20, color: t.inkSecondary },
  consentLink: { color: t.brand, fontWeight: '700' },
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
  backTxt: { color: t.brand, fontSize: 15, fontWeight: '700' },
});
