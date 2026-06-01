import { Stack } from 'expo-router';
import { customerTheme as t } from '../../lib/theme';

export default function CampaignsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.ink,
        headerBackTitle: 'Geri',
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.ink },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Kampanyalar' }} />
      <Stack.Screen name="[slug]" options={{ title: 'Kampanya' }} />
    </Stack>
  );
}
