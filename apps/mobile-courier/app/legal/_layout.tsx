import { Pressable, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { legalPageTitle } from '../../lib/legal-pages';
import { courierTheme as t } from '../../lib/theme';

/** Liste dışından (ör. ödeme talebi) açılınca alt yığın tek ekran kalır; varsayılan geri gizlenir. */
function LegalSlugBackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -4, paddingVertical: 4 }}
      accessibilityRole="button"
      accessibilityLabel="Geri"
    >
      <ChevronLeft color={t.ink} size={26} strokeWidth={2} />
      <Text style={{ color: t.ink, fontSize: 17, marginLeft: -2 }}>Geri</Text>
    </Pressable>
  );
}

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
          headerLeft: () => <LegalSlugBackButton />,
        })}
      />
    </Stack>
  );
}
