import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LegalDocumentModal } from '../../components/LegalDocumentModal';
import {
  acceptCourierConsents,
  COURIER_REGISTRATION_LEGAL_LINKS,
} from '../../lib/courier-consents';
import { courierTheme as t } from '../../lib/theme';

const LINKS = COURIER_REGISTRATION_LEGAL_LINKS;

export default function CourierConsentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [legalSlug, setLegalSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onContinue = useCallback(async () => {
    setErr(null);
    if (!acceptedTerms) {
      setErr('Devam etmek için sözleşmeleri kabul etmeniz gerekir.');
      return;
    }
    setLoading(true);
    try {
      await acceptCourierConsents({ acceptedTerms: true, marketingOptIn });
      const { routeCourierAfterAuth } = await import('../../lib/courier-onboarding');
      await routeCourierAfterAuth(router);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [acceptedTerms, marketingOptIn, router]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Sözleşme ve izinler</Text>
        <Text style={styles.lead}>
          Uygulamayı kullanmaya başlamadan önce aşağıdaki metinleri okuyup onaylamanız gerekir.
        </Text>

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
            <Text onPress={() => setLegalSlug(LINKS[0].slug)} style={styles.link}>
              {LINKS[0].label}
            </Text>
            <Text>, </Text>
            <Text onPress={() => setLegalSlug(LINKS[1].slug)} style={styles.link}>
              {LINKS[1].label}
            </Text>
            <Text>, </Text>
            <Text onPress={() => setLegalSlug(LINKS[2].slug)} style={styles.link}>
              {LINKS[2].label}
            </Text>
            <Text>, </Text>
            <Text onPress={() => setLegalSlug(LINKS[3].slug)} style={styles.link}>
              {LINKS[3].label}
            </Text>
            <Text>, </Text>
            <Text onPress={() => setLegalSlug(LINKS[4].slug)} style={styles.link}>
              {LINKS[4].label}
            </Text>
            <Text> ve </Text>
            <Text onPress={() => setLegalSlug(LINKS[5].slug)} style={styles.link}>
              {LINKS[5].label}
            </Text>
            <Text>’nı okudum ve kabul ediyorum.</Text>
          </Text>
        </View>

        <View style={[styles.consentRow, styles.consentRowOptional]}>
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
            Kampanya, duyuru ve bilgilendirme mesajları almak istiyorum.
          </Text>
        </View>

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, loading && styles.btnDis]}
          onPress={() => void onContinue()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={t.onBrand} />
          ) : (
            <Text style={styles.primaryBtnTxt}>Devam et</Text>
          )}
        </Pressable>
      </ScrollView>

      <LegalDocumentModal
        slug={legalSlug}
        visible={legalSlug != null}
        onClose={() => setLegalSlug(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: t.ink },
  lead: { marginTop: 8, fontSize: 15, lineHeight: 22, color: t.inkMuted, marginBottom: 24 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  consentRowOptional: { marginBottom: 8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: t.brand, borderColor: t.brand },
  consentText: { flex: 1, fontSize: 14, lineHeight: 21, color: t.inkSecondary },
  link: { color: t.brand, fontWeight: '700', textDecorationLine: 'underline' },
  err: { color: t.danger, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: t.brand,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: t.onBrand, fontWeight: '700', fontSize: 16 },
  btnDis: { opacity: 0.75 },
});
