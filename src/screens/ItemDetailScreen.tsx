import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CachedImage, ScreenSafeArea, StarRating } from '../components';
import type { AppStackParamList } from '../navigation/types';
import {
  getCatalogRatingsByRefs,
  subscribeGlobalContentComments,
  type GlobalContentCommentDoc,
} from '../services/firestoreService';
import { appLocaleFromI18n, formatRelativeTime } from '../utils/formatRelativeTime';
import { profileImageDisplayUri } from '../utils/profileImage';
import { colors, radii, scale, spacing, spacingVertical, typography } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ItemDetail'>;

export function ItemDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { itemType, itemId, title, imageUrl } = route.params;
  const [rows, setRows] = useState<GlobalContentCommentDoc[]>([]);
  const [catalogRating, setCatalogRating] = useState<{ averageRating: number; totalRatings: number } | null>(null);

  useEffect(() => {
    return subscribeGlobalContentComments(itemType, itemId, setRows);
  }, [itemId, itemType]);

  useEffect(() => {
    const ref = { kind: itemType, id: itemType === 'movie' ? itemId.replace(/^tmdb_/, '') : itemId } as const;
    void getCatalogRatingsByRefs([ref]).then((map) => {
      setCatalogRating(map[`${ref.kind}:${ref.id}`] ?? null);
    });
  }, [itemId, itemType]);

  const subtitle = useMemo(
    () =>
      t('itemDetail.librarySubtitle', {
        type: itemType === 'book' ? t('collectionType.book') : t('collectionType.film'),
        count: rows.length,
      }),
    [itemType, rows.length, t],
  );
  const coverUri = imageUrl?.trim() || rows.find((x) => x.contentImageUrl?.trim())?.contentImageUrl || undefined;

  return (
    <ScreenSafeArea edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={scale(24)} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: scale(24) }} />
      </View>
      <View style={styles.hero}>
        {coverUri ? <CachedImage uri={coverUri} style={styles.cover} /> : <View style={styles.cover} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.itemMeta}>{subtitle}</Text>
          {typeof catalogRating?.averageRating === 'number' ? (
            <View style={styles.ratingRow}>
              <StarRating rating={catalogRating.averageRating} totalRatings={catalogRating.totalRatings ?? 0} size={scale(12)} />
            </View>
          ) : (
            <Text style={styles.unrated}>{t('rating.notRatedYet')}</Text>
          )}
        </View>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(x) => `${x.postId}_${x.id}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('itemDetail.noComments')}</Text>}
        renderItem={({ item }) => {
          const avatar = profileImageDisplayUri(item.authorProfileImageUrl);
          return (
            <View style={styles.row}>
              {avatar ? <CachedImage uri={avatar} style={styles.avatar} /> : <View style={styles.avatar} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.author}>{item.authorName}</Text>
                {item.kind === 'post' ? <Text style={styles.reviewBadge}>{t('itemDetail.reviewBadge')}</Text> : null}
                {typeof item.rating === 'number' ? <StarRating rating={item.rating} size={scale(12)} /> : null}
                <Text style={styles.comment}>{item.text}</Text>
                <Text style={styles.time}>{formatRelativeTime(item.createdAtMs, appLocaleFromI18n(i18n.language))}</Text>
              </View>
            </View>
          );
        }}
      />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacingVertical.sm },
  topTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '700', flex: 1, textAlign: 'center' },
  hero: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacingVertical.md },
  cover: { width: scale(72), height: scale(72), borderRadius: radii.md, backgroundColor: colors.surfaceElevated },
  itemTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '700' },
  itemMeta: { ...typography.meta, color: colors.textMuted, marginTop: spacingVertical.xs },
  ratingRow: { marginTop: spacingVertical.xs },
  unrated: { ...typography.meta, color: colors.textMuted, marginTop: spacingVertical.xs },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacingVertical.xxl },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacingVertical.sm,
  },
  avatar: { width: scale(34), height: scale(34), borderRadius: scale(17), backgroundColor: colors.surfaceElevated },
  author: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  reviewBadge: { ...typography.caption, color: colors.accentPurple, marginTop: spacingVertical.xxs },
  comment: { ...typography.body, color: colors.textSecondary, marginTop: spacingVertical.xs },
  time: { ...typography.meta, color: colors.textMuted, marginTop: spacingVertical.xs },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacingVertical.xl },
});

