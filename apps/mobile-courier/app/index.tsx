import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { routeCourierAfterAuth } from '../lib/courier-consents';
import { getCourierAccessToken } from '../lib/session';
import { courierTheme as t } from '../lib/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const token = await getCourierAccessToken();
      if (token) {
        await routeCourierAfterAuth(router).catch(() => router.replace('/login'));
      } else {
        router.replace('/login');
      }
    })();
  }, [router]);

  return (
    <View style={styles.box}>
      <ActivityIndicator color={t.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
});
