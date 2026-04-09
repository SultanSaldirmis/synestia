import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenSafeArea } from '../components';
import type { AppStackParamList } from '../navigation/types';
import {
  createMockPost,
  deleteMockPost,
  listMockPosts,
  updateMockPost,
  isMockApiConnectionError,
  type MockPost,
} from '../services/mockApiService';
import { colors, radii, spacing, spacingVertical, typography } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CrudTest'>;

export function CrudTestScreen({ navigation }: Props) {
  const [rows, setRows] = useState<MockPost[]>([]);
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setInlineError(null);
    try {
      setRows(await listMockPosts());
    } catch (e) {
      if (isMockApiConnectionError(e)) {
        setInlineError('Mock API bağlantısı kurulamadı, lütfen internetinizi kontrol edin.');
      } else {
        Alert.alert('Hata', 'Liste yüklenemedi.');
      }
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clearForm = () => {
    setTitle('');
    setContent('');
    setEditingId(null);
  };

  const showSuccessToast = () => {
    const message = "Veri MockAPI'ye başarıyla yazıldı.";
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Başarılı', message);
    }
  };

  const onSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve içerik zorunludur.');
      return;
    }
    setBusy(true);
    setInlineError(null);
    try {
      if (editingId) {
        const updated = await updateMockPost(editingId, { title, content });
        setRows((prev) =>
          prev
            .map((x) => (x.id === editingId ? updated : x))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        );
      } else {
        const created = await createMockPost({ title, content });
        setRows((prev) => [created, ...prev]);
      }
      showSuccessToast();
      clearForm();
    } catch (e) {
      if (isMockApiConnectionError(e)) {
        setInlineError('Mock API bağlantısı kurulamadı, lütfen internetinizi kontrol edin.');
      } else {
        Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onEdit = (item: MockPost) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
  };

  const onDelete = (id: string) => {
    Alert.alert('Kaydı sil', 'Bu kayıt silinecek.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            setInlineError(null);
            try {
              await deleteMockPost(id);
              setRows((prev) => prev.filter((x) => x.id !== id));
              showSuccessToast();
            } catch (e) {
              if (isMockApiConnectionError(e)) {
                setInlineError('Mock API bağlantısı kurulamadı, lütfen internetinizi kontrol edin.');
              } else {
                Alert.alert('Hata', 'Silinemedi.');
              }
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScreenSafeArea edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.wrap}>
        <View style={styles.top}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>Geri</Text>
          </Pressable>
          <Text style={styles.title}>Mock API Post Paylaşımı</Text>
          <View style={{ width: 32 }} />
        </View>
        {inlineError ? <Text style={styles.inlineError}>{inlineError}</Text> : null}

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Başlık"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="İçerik"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.inputMulti]}
          multiline
        />
        <View style={styles.row}>
          <Pressable style={styles.primary} onPress={() => void onSubmit()} disabled={busy}>
            <Text style={styles.primaryTxt}>{editingId ? 'Postu Güncelle' : 'Paylaş'}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => void load()} disabled={busy}>
            <Text style={styles.secondaryTxt}>Listeyi Yenile</Text>
          </Pressable>
        </View>

        {busy ? <ActivityIndicator color={colors.accentPurple} style={{ marginVertical: spacingVertical.sm }} /> : null}

        <FlatList
          data={rows}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingBottom: spacingVertical.xxl }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
              <Text style={styles.cardContent}>{item.content}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => onEdit(item)}>
                  <Text style={styles.edit}>PUT Düzenle</Text>
                </Pressable>
                <Pressable onPress={() => onDelete(item.id)}>
                  <Text style={styles.delete}>DELETE Sil</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacingVertical.md },
  back: { ...typography.body, color: colors.accentPurple },
  title: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '700' },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.sm,
    marginBottom: spacingVertical.sm,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacingVertical.sm },
  primary: {
    flex: 1,
    backgroundColor: colors.profileAccent,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.sm,
    alignItems: 'center',
  },
  primaryTxt: { ...typography.button, color: '#fff' },
  secondary: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryTxt: { ...typography.button, color: colors.textPrimary },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacingVertical.sm,
    backgroundColor: colors.surface,
  },
  cardTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '700' },
  cardMeta: { ...typography.meta, color: colors.textMuted, marginTop: spacingVertical.xxs },
  cardContent: { ...typography.body, color: colors.textSecondary, marginTop: spacingVertical.xs },
  actions: { marginTop: spacingVertical.sm, flexDirection: 'row', justifyContent: 'space-between' },
  edit: { ...typography.meta, color: colors.accentPurple },
  delete: { ...typography.meta, color: colors.danger },
  inlineError: {
    ...typography.meta,
    color: colors.danger,
    marginBottom: spacingVertical.sm,
  },
});
