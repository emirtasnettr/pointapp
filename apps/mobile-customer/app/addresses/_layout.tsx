import { Stack } from 'expo-router';
import { AddAddressHeaderButton } from '../../components/AddAddressHeaderButton';
import { customerTheme as t } from '../../lib/theme';

export default function AddressesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', color: t.ink },
        headerBackTitle: 'Geri',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Adreslerim',
          headerRight: () => <AddAddressHeaderButton />,
          headerRightContainerStyle: { paddingRight: 8, alignItems: 'center' },
        }}
      />
      <Stack.Screen name="new" options={{ title: 'Yeni adres' }} />
      <Stack.Screen name="[id]" options={{ title: 'Adres düzenle' }} />
    </Stack>
  );
}
