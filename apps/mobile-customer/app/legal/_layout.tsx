import { Stack } from 'expo-router';
import { legalPageTitle } from '../../lib/legal-pages';
import { customerTheme as t } from '../../lib/theme';

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.ink },
        headerBackTitle: 'Geri',
        contentStyle: { backgroundColor: t.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Bilgi ve sözleşmeler' }} />
      <Stack.Screen
        name="[slug]"
        options={({ route }) => ({
          title: legalPageTitle((route.params as { slug?: string })?.slug ?? ''),
        })}
      />
    </Stack>
  );
}
