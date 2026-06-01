import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  completeNotificationOnboarding,
  updateNotificationSettings,
} from '../../lib/notification-settings';
import {
  getOrCreateDeviceId,
  platformLabel,
  requestPushPermissionAndToken,
} from '../../lib/push-notifications';
import { customerTheme as t } from '../../lib/theme';

export default function NotificationOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const finish = useCallback(
    async (enable: boolean) => {
      setErr(null);
      setLoading(true);
      try {
        if (enable) {
          const deviceId = await getOrCreateDeviceId();
          const perm = await requestPushPermissionAndToken();
          if (!perm.granted) {
            setErr('Bildirim izni verilmedi. Daha sonra Hesap → Bildirimler üzerinden açabilirsiniz.');
          } else if (!perm.pushToken) {
            setErr(
              perm.error ??
                'Push anahtarı alınamadı. Expo uygulamasını tamamen kapatıp yeniden açın ve tekrar deneyin.',
            );
            return;
          } else {
            await updateNotificationSettings({
              enabled: true,
              deviceId,
              platform: platformLabel(),
              pushToken: perm.pushToken,
            });
          }
        }
        await completeNotificationOnboarding(router);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar style="dark" />
      <View style={styles.iconWrap}>
        <Bell color={t.brand} size={40} strokeWidth={2} />
      </View>
      <Text style={styles.title}>Bildirimlere izin verin</Text>
      <Text style={styles.lead}>
        Teslimat durumu, kampanya ve önemli duyurular hakkında anında bilgi alın. İstediğiniz zaman
        hesap ayarlarından kapatabilirsiniz.
      </Text>

      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Pressable
        style={[styles.primaryBtn, loading && styles.btnDis]}
        onPress={() => void finish(true)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={t.onBrand} />
        ) : (
          <Text style={styles.primaryBtnTxt}>Bildirimlere izin ver</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => void finish(false)}
        disabled={loading}
      >
        <Text style={styles.secondaryBtnTxt}>Şimdi değil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 24 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '800', color: t.ink },
  lead: { marginTop: 12, fontSize: 15, lineHeight: 22, color: t.inkMuted, marginBottom: 32 },
  err: { color: t.danger, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  primaryBtn: {
    backgroundColor: t.brand,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: t.onBrand, fontWeight: '700', fontSize: 16 },
  btnDis: { opacity: 0.75 },
  secondaryBtn: { marginTop: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnTxt: { color: t.brand, fontWeight: '700', fontSize: 15 },
});
