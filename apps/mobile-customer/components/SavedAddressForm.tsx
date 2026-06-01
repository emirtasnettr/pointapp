import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { ChevronDown, MapPin, Trash2 } from 'lucide-react-native';
import { GeoPickerModal } from './GeoPickerModal';
import { GlassCard } from './GlassCard';
import type { CustomerSavedAddressRow } from '../lib/customer-address-types';
import type { GeoDistrict, GeoNeighborhood } from '../lib/geography';
import { fetchDistricts, fetchNeighborhoods } from '../lib/geography';
import { customerTheme as t } from '../lib/theme';

type Props = {
  initial?: CustomerSavedAddressRow | null;
  onSubmit: (body: { title: string; neighborhoodId: string; line1: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function SavedAddressForm({ initial, onSubmit, onDelete }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<GeoNeighborhood[]>([]);

  const [title, setTitle] = useState('');
  const [line1, setLine1] = useState('');
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [districtName, setDistrictName] = useState('');
  const [neighborhoodId, setNeighborhoodId] = useState<string | null>(null);
  const [neighborhoodName, setNeighborhoodName] = useState('');

  const [distOpen, setDistOpen] = useState(false);
  const [nbOpen, setNbOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [nbLoading, setNbLoading] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  const boot = useCallback(async () => {
    setLoading(true);
    setGeoErr(null);
    try {
      // API bölge kodundan İstanbul’u kendisi çözüyor; `regionId` zorunlu değil
      const dlist = await fetchDistricts();
      setDistricts(dlist);
      if (dlist.length === 0) {
        setGeoErr('İlçe listesi boş. API ve veritabanında coğrafya seed’inin yüklü olduğundan emin olun (ör. npm run db:seed).');
      }
      if (initial?.neighborhood) {
        const d = initial.neighborhood.district;
        const n = initial.neighborhood;
        setDistrictId(d.id);
        setDistrictName(d.name);
        setNeighborhoodId(n.id);
        setNeighborhoodName(n.name);
        setTitle(initial.title);
        setLine1(initial.line1);
        const nlist = await fetchNeighborhoods(d.id);
        setNeighborhoods(nlist);
      }
    } catch (e) {
      const msg = (e as Error).message;
      setGeoErr(msg);
      setDistricts([]);
      Alert.alert('Coğrafya yüklenemedi', msg);
    } finally {
      setLoading(false);
    }
  }, [initial]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const onPickDistrict = useCallback(
    async (id: string) => {
      const d = districts.find((x) => x.id === id);
      setDistrictId(id);
      setDistrictName(d?.name ?? '');
      setNeighborhoodId(null);
      setNeighborhoodName('');
      setNeighborhoods([]);
      setNbLoading(true);
      try {
        const nlist = await fetchNeighborhoods(id);
        setNeighborhoods(nlist);
      } catch (e) {
        const msg = (e as Error).message;
        setGeoErr(msg);
        Alert.alert('Mahalleler yüklenemedi', msg);
      } finally {
        setNbLoading(false);
      }
    },
    [districts],
  );

  const onPickNeighborhood = useCallback((id: string) => {
    const n = neighborhoods.find((x) => x.id === id);
    setNeighborhoodId(id);
    setNeighborhoodName(n?.name ?? '');
  }, [neighborhoods]);

  async function submit() {
    if (!title.trim() || !line1.trim() || !neighborhoodId) {
      Alert.alert('Eksik bilgi', 'Başlık, ilçe, mahalle ve açık adres satırı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), neighborhoodId, line1: line1.trim() });
    } catch (e) {
      Alert.alert('Hata', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <Text style={styles.lead}>Yalnızca İstanbul ilçe ve mahalleleri listelenir. Sokak / bina bilgisini aşağıya yazın.</Text>
      {initial && !initial.serviceAvailable && initial.serviceUnavailableReason ? (
        <Text style={styles.svcBanner}>{initial.serviceUnavailableReason}</Text>
      ) : null}
      {geoErr ? <Text style={styles.warn}>{geoErr}</Text> : null}

      <GlassCard style={styles.card}>
        <Text style={styles.lab}>Adres adı</Text>
        <TextInput
          style={styles.inp}
          value={title}
          onChangeText={setTitle}
          placeholder="Örn. Merkez Ofis"
          placeholderTextColor={t.inkSoft}
        />
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.lab}>İlçe</Text>
        <Pressable
          onPress={() => {
            void (async () => {
              if (districts.length > 0) {
                setGeoLoading(false);
                setDistOpen(true);
                return;
              }
              setGeoLoading(true);
              setDistOpen(true);
              try {
                const dlist = await fetchDistricts();
                setDistricts(dlist);
                setGeoErr(dlist.length === 0 ? 'İlçe listesi boş.' : null);
              } catch (e) {
                const msg = (e as Error).message;
                setGeoErr(msg);
                Alert.alert('İlçeler yüklenemedi', msg);
              } finally {
                setGeoLoading(false);
              }
            })();
          }}
          style={styles.select}
        >
          <MapPin size={18} color={t.brand} strokeWidth={2.2} />
          <Text style={[styles.selectTxt, !districtName && styles.ph]} numberOfLines={1}>
            {districtName || 'İlçe seçin…'}
          </Text>
          <ChevronDown size={20} color={t.inkMuted} />
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.lab}>Mahalle</Text>
        <Pressable
          onPress={() => districtId && setNbOpen(true)}
          disabled={!districtId}
          style={[styles.select, !districtId && styles.dis]}
        >
          <MapPin size={18} color="#6366f1" strokeWidth={2.2} />
          <Text style={[styles.selectTxt, !neighborhoodName && styles.ph]} numberOfLines={1}>
            {neighborhoodName || 'Mahalle seçin…'}
          </Text>
          <ChevronDown size={20} color={t.inkMuted} />
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.lab}>Sokak, bina no, kat / daire</Text>
        <TextInput
          style={[styles.inp, styles.inpMulti]}
          value={line1}
          onChangeText={setLine1}
          placeholder="Örn. Büyükdere Cad. No:199"
          placeholderTextColor={t.inkSoft}
          multiline
        />
      </GlassCard>

      <Pressable style={[styles.cta, saving && styles.ctaDis]} onPress={() => void submit()} disabled={saving}>
        {saving ? <ActivityIndicator color={t.onBrand} /> : <Text style={styles.ctaTxt}>Kaydet</Text>}
      </Pressable>

      {onDelete ? (
        <Pressable
          style={styles.del}
          onPress={() => {
            Alert.alert('Adresi sil', 'Bu kayıtlı adres silinsin mi?', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    try {
                      setSaving(true);
                      await onDelete();
                    } catch (e) {
                      Alert.alert('Hata', (e as Error).message);
                    } finally {
                      setSaving(false);
                    }
                  })();
                },
              },
            ]);
          }}
        >
          <Trash2 size={18} color={t.danger} strokeWidth={2.2} />
          <Text style={styles.delTxt}>Adresi sil</Text>
        </Pressable>
      ) : null}

      <GeoPickerModal
        visible={distOpen}
        title="İlçe seçin"
        items={districts.map((d) => ({ id: d.id, title: d.name }))}
        loading={geoLoading}
        onClose={() => {
          setDistOpen(false);
          setGeoLoading(false);
        }}
        onSelect={(id) => void onPickDistrict(id)}
      />
      <GeoPickerModal
        visible={nbOpen}
        title="Mahalle seçin"
        items={neighborhoods.map((n) => ({ id: n.id, title: n.name }))}
        loading={nbLoading}
        listExtraData={`${districtId ?? ''}-${neighborhoods.length}`}
        onClose={() => setNbOpen(false)}
        onSelect={onPickNeighborhood}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  pad: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  lead: { fontSize: 14, color: t.inkMuted, lineHeight: 20, marginBottom: 14 },
  svcBanner: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 14,
    padding: 12,
    borderRadius: t.radiusMd,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  warn: {
    fontSize: 13,
    lineHeight: 18,
    color: t.warn,
    marginBottom: 12,
    padding: 12,
    borderRadius: t.radiusMd,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
  },
  card: { marginBottom: 12 },
  lab: { fontSize: 12, fontWeight: '700', color: t.inkSecondary, marginBottom: 8 },
  inp: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: t.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: t.ink,
    backgroundColor: t.surfaceMuted,
  },
  inpMulti: { minHeight: 88, textAlignVertical: 'top' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: t.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: t.surfaceMuted,
  },
  dis: { opacity: 0.45 },
  selectTxt: { flex: 1, fontSize: 16, fontWeight: '700', color: t.ink },
  ph: { color: t.inkSoft, fontWeight: '600' },
  cta: {
    marginTop: 8,
    backgroundColor: t.brand,
    paddingVertical: 16,
    borderRadius: t.radiusLg,
    alignItems: 'center',
    ...t.shadow,
  },
  ctaDis: { opacity: 0.85 },
  ctaTxt: { color: t.onBrand, fontSize: 17, fontWeight: '800' },
  del: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  delTxt: { fontSize: 16, fontWeight: '800', color: t.danger },
});
