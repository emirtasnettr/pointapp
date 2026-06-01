import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { subscribeLoginRequired } from '../lib/auth-events';
import { courierTheme as t } from '../lib/theme';

function AuthSessionListener() {
  const router = useRouter();
  useEffect(() => {
    return subscribeLoginRequired(() => {
      router.replace('/login');
    });
  }, [router]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthSessionListener />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen
          name="register"
          options={{
            headerShown: true,
            title: 'Kurye kaydı',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: t.ink },
          }}
        />
        <Stack.Screen
          name="onboarding/consents"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="onboarding/documents"
          options={{
            headerShown: true,
            title: 'Evraklar',
            headerBackVisible: false,
            gestureEnabled: false,
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: t.ink },
          }}
        />
        <Stack.Screen
          name="onboarding/pending-review"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="delivery/[id]"
          options={{
            headerShown: true,
            title: 'Teslimat',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: t.ink },
          }}
        />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: true,
            title: 'Profil bilgileri',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: t.ink },
          }}
        />
        <Stack.Screen
          name="payout-request"
          options={{
            headerShown: true,
            title: 'Ödeme talebi',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: t.ink },
          }}
        />
        <Stack.Screen
          name="company-tax"
          options={{
            headerShown: true,
            title: 'Point vergi bilgileri',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: t.ink },
          }}
        />
        <Stack.Screen
          name="bank"
          options={{
            headerShown: true,
            title: 'Banka bilgileri',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: t.ink },
          }}
        />
        <Stack.Screen
          name="account/notifications"
          options={{
            headerShown: true,
            title: 'Bildirimler',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: t.ink },
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
