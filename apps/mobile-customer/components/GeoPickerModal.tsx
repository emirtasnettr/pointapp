import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { customerTheme as t } from '../lib/theme';

export type GeoPickerItem = { id: string; title: string; subtitle?: string };

type Props = {
  visible: boolean;
  title: string;
  items: GeoPickerItem[];
  onClose: () => void;
  onSelect: (id: string) => void;
  /** Liste yeniden çekilirken */
  loading?: boolean;
  /** İlçe değişince FlatList’in eski satırları göstermesini engeller */
  listExtraData?: unknown;
  emptyHint?: string;
};

export function GeoPickerModal({
  visible,
  title,
  items,
  onClose,
  onSelect,
  loading = false,
  listExtraData,
  emptyHint = 'Kayıt bulunamadı. API’nin çalıştığından ve telefonda EXPO_PUBLIC_API_URL (bilgisayar IP’si) ayarlı olduğundan emin olun.',
}: Props) {
  const { height: winH } = useWindowDimensions();
  const listMaxH = Math.min(winH * 0.52, 440);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: Math.min(winH * 0.78, 560) }]}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {loading ? (
            <View style={[styles.listBox, { maxHeight: listMaxH }]}>
              <ActivityIndicator size="large" color={t.brand} style={styles.loader} />
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(it) => it.id}
              extraData={listExtraData ?? items.length}
              style={[styles.listBox, { maxHeight: listMaxH }]}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: it }) => (
                <Pressable
                  onPress={() => {
                    onSelect(it.id);
                    onClose();
                  }}
                  style={styles.row}
                >
                  <Text style={styles.rowTitle}>{it.title}</Text>
                  {it.subtitle ? <Text style={styles.rowSub}>{it.subtitle}</Text> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.empty}>{emptyHint}</Text>}
            />
          )}
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeTxt}>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 34, 48, 0.38)' },
  sheet: {
    marginHorizontal: 16,
    marginBottom: 28,
    borderRadius: t.radiusLg,
    backgroundColor: 'rgba(252, 252, 254, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    ...t.shadow,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: t.ink,
    letterSpacing: -0.3,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listBox: { minHeight: 160 },
  loader: { paddingVertical: 48 },
  empty: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    fontSize: 14,
    lineHeight: 20,
    color: t.inkMuted,
    textAlign: 'center',
  },
  row: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: t.ink, letterSpacing: -0.15 },
  rowSub: { marginTop: 4, fontSize: 13, color: t.inkMuted },
  close: { paddingVertical: 14, alignItems: 'center', backgroundColor: t.surfaceMuted },
  closeTxt: { fontSize: 16, fontWeight: '700', color: t.brand },
});
