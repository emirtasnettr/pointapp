import { useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { subscribeLoginRequired } from '../lib/auth-events';
import { customerTheme as t } from '../lib/theme';

function AuthSessionListener() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    return subscribeLoginRequired(() => {
      const p = pathnameRef.current;
      if (p === '/login' || p === '/register' || p.startsWith('/onboarding')) return;
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
            title: 'Müşteri kaydı',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.bg },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.ink },
          }}
        />
        <Stack.Screen
          name="onboarding/notifications"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="addresses"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="help"
          options={{
            headerShown: true,
            title: 'Yardım',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.bg },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.ink },
          }}
        />
        <Stack.Screen
          name="account/notifications"
          options={{
            headerShown: true,
            title: 'Bildirimler',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.bg },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.ink },
          }}
        />
        <Stack.Screen
          name="account/profile"
          options={{
            headerShown: true,
            title: 'Profil Bilgileri',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.bg },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.ink },
          }}
        />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="campaigns" options={{ headerShown: false }} />
        <Stack.Screen
          name="order/[orderNumber]"
          options={{
            headerShown: true,
            title: 'Teslimat',
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.ink },
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
