import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchCourierOnboarding, routeCourierAfterAuth } from '../../lib/courier-onboarding';
import { courierTheme as t } from '../../lib/theme';

export default function CourierPendingReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const state = await fetchCourierOnboarding();
          if (cancelled) return;
          if (state.account.canAccessDeliveries) {
            router.replace('/(tabs)/pool');
            return;
          }
          if (state.account.needsDocuments) {
            router.replace('/onboarding/documents');
            return;
          }
          if (!state.account.pendingReview) {
            await routeCourierAfterAuth(router);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [router]),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />
      {loading ? (
        <ActivityIndicator color={t.brand} />
      ) : (
        <>
          <View style={styles.iconWrap}>
            <Clock size={40} color={t.brand} />
          </View>
          <Text style={styles.title}>Onay bekleniyor</Text>
          <Text style={styles.lead}>
            Evraklarınız sistem yöneticisi tarafından inceleniyor. Onaylandıktan sonra teslimat havuzuna
            erişebilirsiniz.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 28, justifyContent: 'center' },
  iconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: `${t.brand}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 20, fontSize: 22, fontWeight: '800', color: t.ink, textAlign: 'center' },
  lead: { marginTop: 12, fontSize: 15, lineHeight: 22, color: t.muted, textAlign: 'center' },
});
