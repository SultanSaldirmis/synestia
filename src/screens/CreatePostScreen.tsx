import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage, StarRating } from '../components';
import { useAuth } from '../context/AuthContext';
import { NO_SEARCH_IMAGE_URI } from '../constants/searchPlaceholder';
import type { AttachedContent } from '../data/mockData';
import type { AppStackParamList } from '../navigation/types';
import {
  decodeOpenLibrarySearchId,
  searchBooksAsResults,
  searchSpotifyTracksAsResults,
  searchTmdbMoviesAsResults,
} from '../services/apiService';
import { createFeedPost, getUserProfileOnce, rateCatalogItem } from '../services/firestoreService';
import type { SearchResult } from '../types/searchResult';
import { sanitizeData } from '../utils/firebaseUtils';
import { colors, radii, scale, spacing, spacingVertical, typography } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CreatePost'>;

type WizardStep = 1 | 2 | 3;
type PickKind = 'music' | 'movie' | 'book';

function stripExternalId(sr: SearchResult): string {
  if (sr.type === 'music') return sr.id.replace(/^spotify_/, '');
  if (sr.type === 'movie') return sr.id.replace(/^tmdb_/, '');
  return decodeOpenLibrarySearchId(sr.id);
}

function searchResultToAttached(sr: SearchResult): AttachedContent {
  const id = stripExternalId(sr);
  if (sr.type === 'music') {
    return {
      type: 'song',
      id,
      title: sr.title,
      artistName: sr.subtitle,
      imageUrl: sr.imageUrl,
      externalUrl: `https://open.spotify.com/track/${encodeURIComponent(id)}`,
      previewUrl: sr.previewUrl,
    };
  }
  if (sr.type === 'movie') {
    return {
      type: 'movie',
      id,
      title: sr.title,
      imageUrl: sr.imageUrl,
      externalUrl: `https://www.themoviedb.org/movie/${id}`,
    };
  }
  const path = id.startsWith('/') ? id : `/${id}`;
  return {
    type: 'book',
    id: sr.id,
    title: sr.title,
    imageUrl: sr.imageUrl,
    externalUrl: `https://openlibrary.org${path}`,
  };
}

export function CreatePostScreen({ navigation }: Props) {
  const { user, firebaseConfigured } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [kind, setKind] = useState<PickKind | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string, k: PickKind) => {
      const t = q.trim();
      if (t.length < 2 || (k === 'book' && t.length < 3)) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        let rows: SearchResult[] = [];
        if (k === 'music') rows = await searchSpotifyTracksAsResults(t);
        else if (k === 'movie') rows = await searchTmdbMoviesAsResults(t);
        else rows = await searchBooksAsResults(t);
        setResults(rows);
      } catch (e) {
        if (k === 'book') console.error('[CreatePost] Kitap araması hatası:', e);
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (step !== 2 || !kind) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQ.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(searchQ, kind);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQ, step, kind, runSearch]);

  const goBackStep = useCallback(() => {
    if (step === 1) {
      Keyboard.dismiss();
      navigation.goBack();
      return;
    }
    if (step === 3) {
      setStep(2);
      return;
    }
    setStep(1);
    setKind(null);
    setSearchQ('');
    setResults([]);
    setSelected(null);
  }, [navigation, step]);

  const pickKind = useCallback((k: PickKind) => {
    setKind(k);
    setStep(2);
    setSearchQ('');
    setResults([]);
    setSelected(null);
  }, []);

  const selectResult = useCallback((item: SearchResult) => {
    setSelected(item);
    setRating(0);
    setStep(3);
  }, []);

  const publish = useCallback(async () => {
    if (savingRef.current) return;
    if (!user?.uid) {
      Alert.alert('Oturum', 'Gönderi için giriş yapın.');
      return;
    }
    if (!firebaseConfigured) {
      Alert.alert('Firebase', 'Yapılandırma eksik.');
      return;
    }
    if (!selected) {
      Alert.alert('İçerik', 'Önce bir içerik seçin.');
      return;
    }
    const body = text.trim();
    if (!body) {
      Alert.alert('Metin', 'Gönderinize bir not ekleyin.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const profile = await getUserProfileOnce(user.uid);
      const displayName =
        profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Kullanıcı';
      const attachedRaw = searchResultToAttached(selected);
      const attached = sanitizeData({
        ...attachedRaw,
        previewUrl: attachedRaw.type === 'song' ? attachedRaw.previewUrl ?? null : null,
      }) as AttachedContent;
      await createFeedPost(
        user.uid,
        {
          displayName,
          profileImageUrl: profile?.profileImageUrl,
          isPrivate: profile?.isPrivate === true,
        },
        body,
        attached,
        rating >= 1 ? rating : undefined,
      );
      if ((selected.type === 'book' || selected.type === 'movie') && rating >= 1) {
        const itemId = selected.type === 'movie' ? stripExternalId(selected) : selected.id;
        await rateCatalogItem(selected.type, itemId, user.uid, rating);
      }
      Keyboard.dismiss();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [firebaseConfigured, navigation, rating, selected, text, user]);

  const attachedPreview = selected ? searchResultToAttached(selected) : null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? scale(56) : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={goBackStep} hitSlop={12}>
          <Text style={styles.headerLink}>{step === 1 ? 'İptal' : 'Geri'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Gönderi oluştur' : step === 2 ? 'İçerik seç' : 'Notunu yaz'}
        </Text>
        {step === 3 ? (
          <Pressable onPress={() => void publish()} disabled={saving} hitSlop={12}>
            {saving ? (
              <ActivityIndicator color={colors.accentPurple} size="small" />
            ) : (
              <Text style={styles.headerDone}>Paylaş</Text>
            )}
          </Pressable>
        ) : (
          <View style={{ width: scale(48) }} />
        )}
      </View>

      {step === 1 ? (
        <View style={styles.stepBlock}>
          <Text style={styles.question}>Ne hakkında paylaşmak istersin?</Text>
          <View style={styles.typeGrid}>
            <Pressable style={({ pressed }) => [styles.typeCard, pressed && styles.typeCardPressed]} onPress={() => pickKind('music')}>
              <Ionicons name="musical-notes" size={scale(36)} color={colors.accentPurple} />
              <Text style={styles.typeLabel}>Müzik</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.typeCard, pressed && styles.typeCardPressed]} onPress={() => pickKind('movie')}>
              <Ionicons name="film-outline" size={scale(36)} color={colors.accentLavender} />
              <Text style={styles.typeLabel}>Film</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.typeCard, pressed && styles.typeCardPressed]} onPress={() => pickKind('book')}>
              <Ionicons name="book-outline" size={scale(36)} color={colors.tabActive} />
              <Text style={styles.typeLabel}>Kitap</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === 2 && kind ? (
        <View style={styles.stepFlex}>
          <TextInput
            style={styles.searchInput}
            placeholder={
              kind === 'music' ? 'Şarkı veya sanatçı ara…' : kind === 'movie' ? 'Film ara…' : 'Kitap ara…'
            }
            placeholderTextColor={colors.textMuted}
            value={searchQ}
            onChangeText={setSearchQ}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {searching ? (
            <ActivityIndicator color={colors.accentPurple} style={styles.listSpinner} />
          ) : null}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listPad}
            ListEmptyComponent={
              searchQ.trim().length >= 2 && !searching ? (
                <Text style={styles.emptySearch}>Sonuç yok — farklı anahtar kelime deneyin.</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                onPress={() => selectResult(item)}
              >
                {item.imageUrl?.trim() ? (
                  <CachedImage uri={item.imageUrl} style={styles.resultThumb} />
                ) : (
                  <CachedImage uri={NO_SEARCH_IMAGE_URI} style={styles.resultThumb} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.resultSub} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(20)} color={colors.textMuted} />
              </Pressable>
            )}
          />
        </View>
      ) : null}

      {step === 3 && attachedPreview ? (
        <View style={styles.stepFlex}>
          <View style={styles.selectedCard}>
            {attachedPreview.imageUrl?.trim() ? (
              <CachedImage uri={attachedPreview.imageUrl} style={styles.selectedThumb} />
            ) : (
              <CachedImage uri={NO_SEARCH_IMAGE_URI} style={styles.selectedThumb} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedMeta}>Seçilen içerik</Text>
              <Text style={styles.selectedTitle} numberOfLines={2}>
                {attachedPreview.title}
              </Text>
            </View>
          </View>
          <Text style={styles.composeLabel}>Düşüncelerin</Text>
          <TextInput
            style={styles.input}
            placeholder="Bu içerik hakkında ne düşünüyorsun?"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
          {(selected?.type === 'book' || selected?.type === 'movie') ? (
            <View style={styles.ratingWrap}>
              <Text style={styles.composeLabel}>Yıldız puanı</Text>
              <StarRating rating={rating} onRate={setRating} />
            </View>
          ) : null}
          <Text style={styles.hint}>Gönderin herkese açık akış kurallarına tabidir.</Text>
        </View>
      ) : null}
      </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacingVertical.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingVertical.lg,
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerLink: {
    ...typography.body,
    color: colors.textSecondary,
    minWidth: scale(48),
  },
  headerDone: {
    ...typography.button,
    color: colors.accentPurple,
    minWidth: scale(48),
    textAlign: 'right',
  },
  stepBlock: { paddingBottom: spacingVertical.xl },
  stepFlex: { flex: 1 },
  question: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacingVertical.lg,
    textAlign: 'center',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  typeCard: {
    width: scale(108),
    paddingVertical: spacingVertical.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacingVertical.sm,
  },
  typeCardPressed: { opacity: 0.88 },
  typeLabel: { ...typography.button, color: colors.textPrimary, fontWeight: '700' },
  searchInput: {
    ...typography.body,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: 10,
    marginBottom: spacingVertical.sm,
  },
  listSpinner: { marginVertical: spacingVertical.md },
  listPad: { paddingBottom: spacingVertical.xxl },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacingVertical.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRowPressed: { opacity: 0.9 },
  resultThumb: {
    width: scale(48),
    height: scale(48),
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
  },
  resultTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '600' },
  resultSub: { ...typography.meta, color: colors.textMuted, marginTop: 2 },
  emptySearch: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacingVertical.lg },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: spacingVertical.lg,
  },
  selectedThumb: {
    width: scale(64),
    height: scale(64),
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  selectedMeta: { ...typography.caption, color: colors.accentPurple, fontWeight: '600' },
  selectedTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '700' },
  composeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacingVertical.xs,
    textTransform: 'uppercase',
  },
  input: {
    flex: 1,
    minHeight: scale(160),
    ...typography.body,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: 10,
    marginBottom: spacingVertical.md,
  },
  hint: {
    ...typography.meta,
    color: colors.textMuted,
  },
  ratingWrap: { marginBottom: spacingVertical.md },
});
