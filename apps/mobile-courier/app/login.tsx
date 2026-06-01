import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle, Lock, Mail, Package } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiPost } from '../lib/api';
import { fetchPublicBrand } from '../lib/brand-public';
import { routeCourierAfterAuth } from '../lib/courier-consents';
import { getCourierAccessToken, setCourierSession } from '../lib/session';
import { courierTheme as t } from '../lib/theme';

const SKY = ['#f0fdf4', '#f8fafc', '#fefefe'] as const;

type LoginResponse = {
  accessToken: string;
  user: { email: string; courierPublicId: string };
  account?: {
    rejectionReason: string | null;
    rejected: boolean;
    pendingReview: boolean;
    needsDocuments: boolean;
  };
};

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [heroLogoUri, setHeroLogoUri] = useState<string | null>(null);
  const [heroLogoFailed, setHeroLogoFailed] = useState(false);
  const [brandLoaded, setBrandLoaded] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    void getCourierAccessToken().then((token) => {
      if (token) void routeCourierAfterAuth(router).catch(() => router.replace('/login'));
    });
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const b = await fetchPublicBrand();
      if (cancelled) return;
      const dark = b.logoDarkUrl?.trim() || null;
      const light = b.logoLightUrl?.trim() || null;
      setHeroLogoUri(light || dark || null);
      setHeroLogoFailed(false);
      setBrandLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = useCallback(async () => {
    setErr(null);
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setErr('E-posta ve şifre gerekli.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost<LoginResponse>('/auth/courier/login', { email: e, password });
      await setCourierSession({
        accessToken: res.accessToken,
        email: res.user.email,
        courierPublicId: res.user.courierPublicId,
      });
      await routeCourierAfterAuth(router);
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...SKY]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <View style={styles.ring} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.center}>
            {heroLogoUri && !heroLogoFailed ? (
              <Image
                source={{ uri: heroLogoUri }}
                style={styles.logoImg}
                resizeMode="contain"
                accessibilityRole="image"
                onError={() => setHeroLogoFailed(true)}
              />
            ) : (
              <View style={styles.logoFallback}>
                <Package color={t.brand} size={40} strokeWidth={2} />
              </View>
            )}

            {!heroLogoUri && brandLoaded ? (
              <Text style={styles.wordmark}>POINT</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.underBlock}>
              <Text style={styles.lab}>E-posta</Text>
              <View style={[styles.underRow, emailFocused && styles.underOn]}>
                <Mail color={t.inkSoft} size={19} strokeWidth={2} style={styles.underIcon} />
                <TextInput
                  style={styles.underInput}
                  placeholder="ornek@firma.com"
                  placeholderTextColor={t.inkSoft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            <View style={styles.underBlock}>
              <Text style={styles.lab}>Şifre</Text>
              <View style={[styles.underRow, passwordFocused && styles.underOn]}>
                <Lock color={t.inkSoft} size={19} strokeWidth={2} style={styles.underIcon} />
                <TextInput
                  style={styles.underInput}
                  placeholder="••••••••"
                  placeholderTextColor={t.inkSoft}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
              </View>
            </View>

            {err ? (
              <View style={styles.errBox} accessibilityRole="alert">
                <AlertCircle color={t.danger} size={18} strokeWidth={2} />
                <Text style={styles.err}>{err}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void onSubmit()}
              disabled={loading}
              style={({ pressed }) => [styles.btnOuter, pressed && !loading && styles.btnPress]}
            >
              <LinearGradient
                colors={['#3edd7a', t.brand, '#129a40']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.btnGrad, loading && styles.btnDim]}
              >
                {loading ? (
                  <ActivityIndicator color={t.onBrand} />
                ) : (
                  <Text style={styles.btnTxt}>Devam et</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/register')} disabled={loading} style={styles.registerLink}>
            <Text style={styles.registerLinkTxt}>
              Hesabın yok mu? <Text style={styles.registerLinkBold}>Kayıt ol</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fefefe' },
  flex: { flex: 1 },
  ring: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(22, 178, 75, 0.08)',
    top: -180,
    alignSelf: 'center',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  center: { alignItems: 'center', paddingBottom: 22 },
  logoImg: {
    width: 220,
    height: 52,
    marginBottom: 16,
  },
  logoFallback: {
    height: 52,
    marginBottom: 16,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    marginBottom: 10,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 5,
    color: t.inkSoft,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.06,
        shadowRadius: 32,
      },
      android: { elevation: 4 },
    }),
  },
  underBlock: { marginBottom: 22 },
  lab: { fontSize: 12, fontWeight: '700', color: t.inkSecondary, marginBottom: 8, marginLeft: 2 },
  underRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  underOn: { borderBottomColor: t.brand },
  underIcon: { marginRight: 10 },
  underInput: {
    flex: 1,
    fontSize: 17,
    color: t.ink,
    fontWeight: '600',
    paddingVertical: 12,
    paddingRight: 8,
  },
  errBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: t.dangerBg,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.1)',
  },
  err: { flex: 1, color: t.danger, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  btnOuter: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: t.brand,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: { elevation: 5 },
    }),
  },
  btnPress: { opacity: 0.93, transform: [{ scale: 0.99 }] },
  btnGrad: { paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  btnDim: { opacity: 0.8 },
  btnTxt: { color: t.onBrand, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  registerLink: { marginTop: 22, alignItems: 'center', paddingVertical: 8 },
  registerLinkTxt: { color: t.inkMuted, fontSize: 15 },
  registerLinkBold: { color: t.brand, fontWeight: '800' },
});
