import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
  Pressable,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from '../../lib/notification-settings';
import {
  getOrCreateDeviceId,
  getOsNotificationPermission,
  platformLabel,
  requestPushPermissionAndToken,
} from '../../lib/push-notifications';
import { courierTheme as t } from '../../lib/theme';

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [osPermission, setOsPermission] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined',
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const syncPushTokenIfNeeded = useCallback(async () => {
    const perm = await getOsNotificationPermission();
    if (perm !== 'granted') return;
    const push = await requestPushPermissionAndToken();
    if (!push.pushToken) return;
    const deviceId = await getOrCreateDeviceId();
    await updateNotificationSettings({
      enabled: true,
      deviceId,
      platform: platformLabel(),
      pushToken: push.pushToken,
    });
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [s, perm] = await Promise.all([fetchNotificationSettings(), getOsNotificationPermission()]);
      setSettings(s);
      setOsPermission(perm);
      if (perm === 'granted' && s.enabled) {
        await syncPushTokenIfNeeded();
        const refreshed = await fetchNotificationSettings();
        setSettings(refreshed);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [syncPushTokenIfNeeded]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onToggle = useCallback(
    async (next: boolean) => {
      if (!settings || saving) return;
      setSaving(true);
      setErr(null);
      try {
        const deviceId = await getOrCreateDeviceId();
        let pushToken: string | null = null;
        let enabled = false;

        if (next) {
          const perm = await requestPushPermissionAndToken();
          enabled = perm.granted && Boolean(perm.pushToken);
          pushToken = perm.pushToken;
          if (!perm.granted) {
            setErr(
              'Sistem bildirim izni kapalı. Ayarlardan Point Kurye uygulaması için bildirimleri açabilirsiniz.',
            );
          } else if (!perm.pushToken) {
            setErr(
              perm.error ??
                'Push anahtarı alınamadı. Uygulamayı tamamen kapatıp yeniden açın ve tekrar deneyin.',
            );
            return;
          }
          setOsPermission(perm.granted ? 'granted' : 'denied');
        }

        const updated = await updateNotificationSettings({
          enabled,
          deviceId,
          platform: platformLabel(),
          pushToken: next ? pushToken : null,
        });
        setSettings(updated);
      } catch (e) {
        setErr((e as Error).message);
        void load();
      } finally {
        setSaving(false);
      }
    },
    [settings, saving, load],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  const enabled = settings?.enabled ?? false;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        Teslimat, operasyon ve duyuru bildirimlerini almak için açın. Kapattığınızda tercihiniz
        kaydedilir; sistem iznini cihaz ayarlarından yönetebilirsiniz.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Bildirimler</Text>
          {saving ? (
            <ActivityIndicator color={t.brand} />
          ) : (
            <Switch
              value={enabled}
              onValueChange={(v) => void onToggle(v)}
              trackColor={{ false: t.border, true: t.brandMuted }}
              thumbColor={enabled ? t.brand : '#f4f4f5'}
            />
          )}
        </View>
        {settings?.updatedAt ? (
          <Text style={styles.meta}>
            Son tercih: {new Date(settings.updatedAt).toLocaleString('tr-TR')}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          Cihaz izni:{' '}
          {osPermission === 'granted'
            ? 'Verildi'
            : osPermission === 'denied'
              ? 'Kapalı'
              : 'Henüz sorulmadı'}
        </Text>
      </View>

      {osPermission === 'denied' && enabled ? (
        <Pressable style={styles.settingsLink} onPress={() => void Linking.openSettings()}>
          <Text style={styles.settingsLinkTxt}>Cihaz ayarlarını aç</Text>
        </Pressable>
      ) : null}

      {err ? <Text style={styles.err}>{err}</Text> : null}

      {Platform.OS === 'ios' || Platform.OS === 'android' ? (
        <Text style={styles.hint}>
          Bildirimleri kapattığınızda uygulama tercihinizi kaydeder. Tamamen kapatmak için telefon
          ayarlarından bildirim iznini de kapatabilirsiniz.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  lead: { fontSize: 14, lineHeight: 21, color: t.inkMuted, marginBottom: 16 },
  card: {
    padding: 16,
    borderRadius: t.radiusLg,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    ...t.shadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, fontWeight: '700', color: t.ink, flex: 1, paddingRight: 12 },
  meta: { marginTop: 10, fontSize: 12, color: t.inkMuted, lineHeight: 18 },
  settingsLink: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: t.radiusMd,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  settingsLinkTxt: { color: t.brand, fontWeight: '700', fontSize: 14 },
  err: { marginTop: 16, color: t.danger, fontSize: 14, fontWeight: '600' },
  hint: { marginTop: 20, fontSize: 12, color: t.inkSoft, lineHeight: 18 },
});
