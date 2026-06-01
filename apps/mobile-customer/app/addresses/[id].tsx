import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SavedAddressForm } from '../../components/SavedAddressForm';
import { apiDeleteAuth, apiGetAuth, apiPatchAuth } from '../../lib/api';
import type { CustomerSavedAddressRow } from '../../lib/customer-address-types';
import { customerTheme as t } from '../../lib/theme';

export default function EditSavedAddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [row, setRow] = useState<CustomerSavedAddressRow | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiGetAuth<CustomerSavedAddressRow>(`/customer/addresses/${encodeURIComponent(id)}`);
      setRow(data);
    } catch {
      setErr(true);
      setRow(null);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err || !id) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Adres yüklenemedi.</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  return (
    <SavedAddressForm
      initial={row}
      onSubmit={async (body) => {
        await apiPatchAuth(`/customer/addresses/${encodeURIComponent(id)}`, body);
        router.back();
      }}
      onDelete={async () => {
        await apiDeleteAuth(`/customer/addresses/${encodeURIComponent(id)}`);
        router.replace('/addresses');
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { fontSize: 15, fontWeight: '600', color: t.inkSecondary, textAlign: 'center' },
});
