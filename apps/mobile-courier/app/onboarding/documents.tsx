import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Upload } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchCourierOnboarding,
  saveOnboardingText,
  submitOnboardingForReview,
  uploadOnboardingFile,
  type CourierOnboardingState,
  type OnboardingRequirement,
} from '../../lib/courier-onboarding';
import { courierTheme as t } from '../../lib/theme';

export default function CourierDocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CourierOnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const state = await fetchCourierOnboarding();
      setData(state);
      const drafts: Record<string, string> = {};
      for (const r of state.requirements) {
        if (r.kind === 'TEXT') drafts[r.id] = r.textValue ?? '';
      }
      setTextDrafts(drafts);
      if (state.account.pendingReview) {
        router.replace('/onboarding/pending-review');
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const saveText = useCallback(async (req: OnboardingRequirement) => {
    try {
      await saveOnboardingText(req.id, textDrafts[req.id] ?? '');
      await load();
    } catch (e) {
      Alert.alert('Kaydedilemedi', (e as Error).message);
    }
  }, [load, textDrafts]);

  const pickFile = useCallback(
    async (req: OnboardingRequirement) => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setUploadingId(req.id);
      try {
        const form = new FormData();
        form.append('file', {
          uri: asset.uri,
          name: asset.name ?? 'belge',
          type: asset.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
        await uploadOnboardingFile(req.id, form);
        await load();
      } catch (e) {
        Alert.alert('Yüklenemedi', (e as Error).message);
      } finally {
        setUploadingId(null);
      }
    },
    [load],
  );

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    setErr(null);
    try {
      await submitOnboardingForReview();
      router.replace('/onboarding/pending-review');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [router]);

  const hasRejectedFields = data?.requirements.some((r) => r.reviewStatus === 'REJECTED') ?? false;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Evraklarınız</Text>
        <Text style={styles.lead}>
          Hesabınızın onaylanması için aşağıdaki bilgi ve belgeleri tamamlayıp incelemeye gönderin.
        </Text>

        {hasRejectedFields ? (
          <View style={styles.rejectBox}>
            <Text style={styles.rejectTitle}>Düzeltilmesi gereken alanlar var</Text>
            <Text style={styles.rejectText}>
              Kırmızı işaretli alanları güncelleyin; onaylanmış alanlar değiştirilemez.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={t.brand} style={{ marginTop: 24 }} />
        ) : err && !data ? (
          <Text style={styles.err}>{err}</Text>
        ) : (
          <>
            {data?.requirements.map((req) => {
              const approved = req.reviewStatus === 'APPROVED';
              const rejected = req.reviewStatus === 'REJECTED';
              const editable = req.canEdit;

              return (
              <View
                key={req.id}
                style={[
                  styles.card,
                  approved && styles.cardApproved,
                  rejected && styles.cardRejected,
                ]}
              >
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>
                    {req.label}
                    {req.required ? ' *' : ''}
                  </Text>
                  {approved ? (
                    <Text style={styles.badgeApproved}>Onaylandı</Text>
                  ) : rejected ? (
                    <Text style={styles.badgeRejected}>Reddedildi</Text>
                  ) : null}
                </View>
                {req.hint ? <Text style={styles.cardHint}>{req.hint}</Text> : null}

                {rejected && req.rejectionReason ? (
                  <Text style={styles.fieldRejectReason}>{req.rejectionReason}</Text>
                ) : null}

                {req.kind === 'TEXT' ? (
                  <>
                    <TextInput
                      value={textDrafts[req.id] ?? ''}
                      onChangeText={(v) => setTextDrafts((d) => ({ ...d, [req.id]: v }))}
                      placeholder="Bilgiyi girin"
                      style={[styles.input, !editable && styles.inputDisabled]}
                      multiline
                      editable={editable}
                    />
                    {editable ? (
                      <Pressable style={styles.secondaryBtn} onPress={() => void saveText(req)}>
                        <Text style={styles.secondaryBtnText}>Kaydet</Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <>
                    {req.fileUrl ? (
                      <Pressable onPress={() => void Linking.openURL(req.fileUrl!)}>
                        <Text style={styles.fileLink}>Yüklenen dosyayı görüntüle</Text>
                      </Pressable>
                    ) : null}
                    {editable ? (
                    <Pressable
                      style={styles.uploadBtn}
                      onPress={() => void pickFile(req)}
                      disabled={uploadingId === req.id}
                    >
                      {uploadingId === req.id ? (
                        <ActivityIndicator color={t.brand} />
                      ) : (
                        <>
                          <Upload size={18} color={t.brand} />
                          <Text style={styles.uploadBtnText}>
                            {req.fileUrl ? 'Dosyayı değiştir' : 'Dosya seç'}
                          </Text>
                        </>
                      )}
                    </Pressable>
                    ) : null}
                  </>
                )}
              </View>
            );
            })}

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              onPress={() => void onSubmit()}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Onaya gönder</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '800', color: t.ink },
  lead: { marginTop: 8, fontSize: 14, lineHeight: 20, color: t.muted },
  rejectBox: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 14,
  },
  rejectTitle: { fontSize: 14, fontWeight: '700', color: '#991b1b' },
  rejectText: { marginTop: 6, fontSize: 14, color: '#7f1d1d', lineHeight: 20 },
  rejectHint: { marginTop: 8, fontSize: 12, color: '#b91c1c' },
  card: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    padding: 14,
  },
  cardApproved: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  cardRejected: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: t.ink, flex: 1 },
  badgeApproved: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  badgeRejected: { fontSize: 11, fontWeight: '700', color: '#b91c1c' },
  fieldRejectReason: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#991b1b',
  },
  cardHint: { marginTop: 4, fontSize: 12, color: t.muted },
  input: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: t.ink,
    backgroundColor: t.bg,
  },
  inputDisabled: { opacity: 0.65, backgroundColor: '#f4f4f5' },
  secondaryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: `${t.brand}18`,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: t.brand },
  uploadBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    borderStyle: 'dashed',
  },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: t.brand },
  fileLink: { marginTop: 8, fontSize: 13, fontWeight: '600', color: t.brand },
  primaryBtn: {
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: t.brand,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  err: { marginTop: 12, fontSize: 13, color: '#b91c1c' },
});
