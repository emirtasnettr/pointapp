import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { routeCustomerAfterAuth } from '../lib/notification-settings';
import { validateCustomerSession } from '../lib/validate-session';
import { customerTheme as t } from '../lib/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      if (await validateCustomerSession()) {
        await routeCustomerAfterAuth(router);
      } else {
        router.replace('/login');
      }
    })();
  }, []);

  return (
    <View style={styles.box}>
      <ActivityIndicator color={t.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
});
