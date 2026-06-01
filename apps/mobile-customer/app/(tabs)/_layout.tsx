import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Redirect, Tabs, useFocusEffect } from 'expo-router';
import { FileText, LayoutGrid, MapPinned, PlusCircle, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddAddressHeaderButton } from '../../components/AddAddressHeaderButton';
import { getCustomerAccessToken } from '../../lib/session';
import { customerTheme as t } from '../../lib/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [gate, setGate] = useState<'unknown' | 'in' | 'out'>('unknown');

  const tabBarBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 10) + 10;
  const tabBarTop = 8;
  const tabContentHeight = 52;
  const tabBarHeight = tabContentHeight + tabBarTop + tabBarBottom;

  useEffect(() => {
    void getCustomerAccessToken().then((token) => setGate(token ? 'in' : 'out'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (gate !== 'in') return;
      void getCustomerAccessToken().then((token) => {
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
      initialRouteName="index"
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.ink,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          letterSpacing: -0.35,
          color: t.ink,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: 'rgba(148, 163, 184, 0.16)',
          height: tabBarHeight,
          paddingBottom: tabBarBottom,
          paddingTop: tabBarTop,
          ...Platform.select({
            ios: {
              shadowColor: '#28303d',
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
            },
            default: { elevation: 12 },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.15,
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
        name="index"
        options={{
          title: 'Ana sayfa',
          headerTitle: '',
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Faturalarım',
          headerTitle: 'Faturalarım',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Yeni',
          headerTitle: 'Yeni teslimat',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="addresses"
        options={{
          title: 'Adreslerim',
          headerTitle: 'Adreslerim',
          headerRight: () => <AddAddressHeaderButton />,
          headerRightContainerStyle: { paddingRight: 8, alignItems: 'center' },
          tabBarIcon: ({ color, size }) => <MapPinned color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen
        name="hesap"
        options={{
          title: 'Hesap',
          headerTitle: 'Hesabım',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
});
