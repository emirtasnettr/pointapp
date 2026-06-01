import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { customerTheme as t } from '../lib/theme';

/** Header sağ aksiyonu — taşmayı önlemek için gölgesiz ve kompakt. */
export function AddAddressHeaderButton() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => router.push('/addresses/new')}
        style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Yeni adres ekle"
      >
        <View style={styles.btn}>
          <Plus color={t.onBrand} size={18} strokeWidth={2.5} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  hit: { alignItems: 'center', justifyContent: 'center' },
  hitPressed: { opacity: 0.88 },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
