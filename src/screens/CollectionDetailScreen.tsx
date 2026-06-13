import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CachedImage, ProfileImageZoomModal, ScreenSafeArea } from '../components';
import { useAuth } from '../context/AuthContext';
import type { AppStackParamList } from '../navigation/types';
import { searchBooksAsResults, searchSpotifyTracksAsResults, searchTmdbMoviesAsResults } from '../services/apiService';
import {
  deleteUserCollection,
  removeItemFromCollection,
  saveContentToUserCollection,
  subscribeCollectionItems,
  type CollectionItemDoc,
} from '../services/firestoreService';
import type { SearchResult } from '../types/searchResult';
import { getCollectionTypeLabel } from '../utils/collectionLabels';
import { getCollectionDisplayName } from '../utils/collectionDisplayName';
import { colors, radii, scale, spacing, spacingVertical, typography } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CollectionDetail'>;

export function CollectionDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { userId, collectionId, collectionName, collectionType = 'mixed' } = route.params;
  const { user } = useAuth();
  const [items, setItems] = useState<CollectionItemDoc[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  const isOwner = user?.uid === userId;
  const filters: Array<'movie' | 'music' | 'book'> = useMemo(() => {
    if (collectionType === 'film') return ['movie'];
    if (collectionType === 'music') return ['music'];
    if (collectionType === 'book') return ['book'];
    return ['movie', 'music', 'book'];
  }, [collectionType]);

  useEffect(() => {
    return subscribeCollectionItems(userId, collectionId, setItems);
  }, [collectionId, userId]);

  useEffect(() => {
    if (!searchOpen || q.trim().length < 2) {
      setRows([]);
      return;
    }
    setSearching(true);
    void (async () => {
      try {
        const tasks: Promise<SearchResult[]>[] = [];
        if (filters.includes('movie')) tasks.push(searchTmdbMoviesAsResults(q));
        if (filters.includes('music')) tasks.push(searchSpotifyTracksAsResults(q));
        if (filters.includes('book')) tasks.push(searchBooksAsResults(q));
        const out = (await Promise.all(tasks)).flat();
        setRows(out);
      } finally {
        setSearching(false);
      }
    })();
  }, [filters, q, searchOpen]);

  const onDeleteCollection = () => {
    if (!user?.uid || !isOwner) return;
    Alert.alert(t('collection.deleteTitle'), t('collection.deleteWithItemsMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteUserCollection(userId, collectionId, user.uid);
              navigation.goBack();
            } catch (e) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('post.deleteFailed'));
            }
          })();
        },
      },
    ]);
  };

  const confirmRemoveItem = (item: CollectionItemDoc) => {
    if (!user?.uid || !isOwner) return;
    Alert.alert(t('collection.removeItemTitle'), t('collection.removeItemMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await removeItemFromCollection(user.uid, collectionId, item.id);
            } catch (e) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('post.deleteFailed'));
            }
          })();
        },
      },
    ]);
  };

  const onAdd = async (r: SearchResult) => {
    if (!user?.uid || !isOwner) return;
    try {
      const contentType = r.type === 'music' ? 'music' : r.type === 'movie' ? 'movie' : 'book';
      await saveContentToUserCollection(user.uid, collectionId, {
        title: r.title,
        imageUrl: r.imageUrl,
        contentType,
        externalUrl:
          r.type === 'music'
            ? `https://open.spotify.com/track/${r.id.replace(/^spotify_/, '')}`
            : r.type === 'movie'
              ? `https://www.themoviedb.org/movie/${r.id.replace(/^tmdb_/, '')}`
              : `https://openlibrary.org/${r.id.replace(/^openlib_/, '').split('__').join('/')}`,
      });
      if (Platform.OS === 'android') ToastAndroid.show(t('collection.addedToast'), ToastAndroid.SHORT);
      else Alert.alert(t('collection.saved'));
      setSearchOpen(false);
      setQ('');
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('collection.addFailed'));
    }
  };

  return (
    <ScreenSafeArea edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {getCollectionDisplayName(collectionName, t)}
        </Text>
        {isOwner ? (
          <Pressable onPress={onDeleteCollection} hitSlop={12} style={styles.trashHit} accessibilityLabel={t('collection.delete')}>
            <Ionicons name="trash-outline" size={scale(22)} color={colors.textMuted} />
          </Pressable>
        ) : (
          <View style={{ width: scale(24) }} />
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="folder-open-outline" size={scale(56)} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('collection.emptyTitle')}</Text>
          <Text style={styles.emptySub}>{t('collection.emptySub')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.rowWrap}>
              <Pressable
                style={({ pressed }) => [styles.row, styles.rowFlex, pressed && styles.rowPressed]}
                onPress={() => {
                  if (item.contentType === 'moment' && item.imageUrl?.trim()) {
                    setZoomUri(item.imageUrl.trim());
                    return;
                  }
                  if (item.contentType === 'music') return;
                  const u = item.externalUrl?.trim();
                  if (u) void Linking.openURL(u);
                }}
              >
                {item.imageUrl ? (
                  <CachedImage uri={item.imageUrl} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Ionicons name="document-text-outline" size={scale(24)} color={colors.textMuted} />
                  </View>
                )}
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </Pressable>
              {isOwner && (
                <Pressable
                  onPress={() => confirmRemoveItem(item)}
                  hitSlop={8}
                  style={styles.deleteHit}
                  accessibilityLabel={t('collection.removeItem')}
                >
                  <Ionicons name="trash-outline" size={scale(18)} color={colors.danger} />
                </Pressable>
              )}
            </View>
          )}
        />
      )}
      {isOwner ? (
        <Pressable style={styles.fab} onPress={() => setSearchOpen(true)} accessibilityLabel={t('collection.addContent')}>
          <Ionicons name="add" size={scale(26)} color="#fff" />
        </Pressable>
      ) : null}

      <Modal visible={searchOpen} transparent animationType="slide" onRequestClose={() => setSearchOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSearchOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('collection.addToCollection')}</Text>
          <Text style={styles.modalMeta}>
            {t('collection.typeLabel', { type: getCollectionTypeLabel(t, collectionType) })}
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search')}
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
          />
          <ScrollView>
            {searching ? <Text style={styles.modalMeta}>{t('common.searching')}</Text> : null}
            {rows.map((r) => (
              <Pressable key={r.id} style={styles.searchRow} onPress={() => void onAdd(r)}>
                {r.imageUrl ? <CachedImage uri={r.imageUrl} style={styles.searchThumb} /> : <View style={styles.searchThumb} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchTitle} numberOfLines={1}>{r.title}</Text>
                  <Text style={styles.modalMeta}>{r.subtitle}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={scale(22)} color={colors.accentPurple} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
      <ProfileImageZoomModal visible={Boolean(zoomUri)} imageUri={zoomUri ?? undefined} onClose={() => setZoomUri(null)} />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacingVertical.md,
    gap: spacing.sm,
  },
  backHit: { padding: spacing.xxs },
  trashHit: { padding: spacing.xxs },
  title: {
    flex: 1,
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: scale(18),
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacingVertical.xxl },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingVertical.sm,
  },
  rowFlex: { flex: 1, marginBottom: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacingVertical.sm,
  },
  deleteHit: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  thumb: {
    width: scale(56),
    height: scale(56),
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
  },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  rowTitle: { ...typography.body, color: colors.textPrimary, flex: 1, fontWeight: '600' },
  rowPressed: { opacity: 0.9 },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacingVertical.xxl,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: spacingVertical.lg,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySub: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacingVertical.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacingVertical.xxl,
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.profileAccent,
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: '18%',
    bottom: '10%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '700' },
  modalMeta: { ...typography.meta, color: colors.textMuted, marginTop: spacingVertical.xs },
  searchInput: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    marginTop: spacingVertical.md,
    marginBottom: spacingVertical.md,
    padding: spacing.md,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacingVertical.sm },
  searchThumb: { width: scale(44), height: scale(44), borderRadius: radii.sm, backgroundColor: colors.surfaceElevated },
  searchTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
});
