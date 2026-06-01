import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Redirect, Tabs, useFocusEffect } from 'expo-router';
import { Inbox, Bike, ClipboardList, Wallet, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCourierAccessToken } from '../../lib/session';
import { courierTheme as t } from '../../lib/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [gate, setGate] = useState<'unknown' | 'in' | 'out'>('unknown');

  /** Alt çentik + minimum nefes payı; sabit height yerine inset ile hesaplanır */
  const tabBarBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 10) + 10;
  const tabBarTop = 8;
  const tabContentHeight = 52;
  const tabBarHeight = tabContentHeight + tabBarTop + tabBarBottom;

  useEffect(() => {
    void getCourierAccessToken().then((token) => setGate(token ? 'in' : 'out'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (gate !== 'in') return;
      void getCourierAccessToken().then((token) => {
        if (!token) setGate('out');
      });
    }, [gate]),
  );

  if (gate === 'unknown') {
    return (
      <View style={styles.gate}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  if (gate === 'out') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.ink,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingBottom: tabBarBottom,
          paddingTop: tabBarTop,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        tabBarActiveTintColor: t.brand,
        tabBarInactiveTintColor: t.inkMuted,
      }}
    >
      <Tabs.Screen
        name="pool"
        options={{
          title: 'Havuz',
          tabBarIcon: ({ color, size }) => <Inbox color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: 'Aktif',
          tabBarIcon: ({ color, size }) => <Bike color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Geçmiş',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Kazanç',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="hesap"
        options={{
          title: 'Hesap',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
});
