import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { showMessage } from 'react-native-flash-message';
import { CachedImage, ScreenSafeArea, StarRating } from '../components';
import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import type { AppStackParamList } from '../navigation/types';
import {
  getCatalogRatingsByRefs,
  getUserCatalogRating,
  rateCatalogItem,
  subscribeGlobalContentComments,
  type GlobalContentCommentDoc,
} from '../services/firestoreService';
import { appLocaleFromI18n, formatRelativeTime } from '../utils/formatRelativeTime';
import { useAuthorAvatarMap } from '../hooks/useAuthorAvatarMap';
import { profileImageDisplayUri } from '../utils/profileImage';
import { colors, radii, scale, spacing, spacingVertical, typography } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ItemDetail'>;

export function ItemDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { itemType, itemId, title, imageUrl } = route.params;
  const [rows, setRows] = useState<GlobalContentCommentDoc[]>([]);
  const [catalogRating, setCatalogRating] = useState<{ averageRating: number; totalRatings: number } | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);

  const catalogItemId = itemType === 'movie' ? itemId.replace(/^tmdb_/, '') : itemId;

  useEffect(() => {
    return subscribeGlobalContentComments(itemType, itemId, setRows);
  }, [itemId, itemType]);

  useEffect(() => {
    const ref = { kind: itemType, id: catalogItemId } as const;
    void getCatalogRatingsByRefs([ref]).then((map) => {
      setCatalogRating(map[`${ref.kind}:${ref.id}`] ?? null);
    });
  }, [catalogItemId, itemType]);

  useEffect(() => {
    if (!user?.uid || !isFirebaseConfigured()) {
      setUserRating(null);
      return;
    }
    void getUserCatalogRating(itemType, catalogItemId, user.uid).then(setUserRating);
  }, [catalogItemId, itemType, user?.uid]);

  const onRate = useCallback(
    async (value: number) => {
      if (!user?.uid) {
        Alert.alert(t('common.error'), t('common.loginRequired'));
        return;
      }
      if (!isFirebaseConfigured()) {
        showMessage({ message: t('auth.serverUnavailable'), type: 'warning' });
        return;
      }
      setRatingBusy(true);
      try {
        const summary = await rateCatalogItem(itemType, catalogItemId, user.uid, value);
        setUserRating(value);
        setCatalogRating({
          averageRating: summary.averageRating,
          totalRatings: summary.totalRatings,
        });
        showMessage({ message: t('rating.saved'), type: 'success' });
      } catch (e) {
        showMessage({
          message: e instanceof Error ? e.message : t('common.actionFailed'),
          type: 'danger',
        });
      } finally {
        setRatingBusy(false);
      }
    },
    [catalogItemId, itemType, t, user?.uid],
  );

  const subtitle = useMemo(
    () =>
      t('itemDetail.librarySubtitle', {
        type: itemType === 'book' ? t('collectionType.book') : t('collectionType.film'),
        count: rows.length,
      }),
    [itemType, rows.length, t],
  );
  const coverUri = imageUrl?.trim() || rows.find((x) => x.contentImageUrl?.trim())?.contentImageUrl || undefined;

  const rowAuthorUids = useMemo(
    () => [...new Set(rows.map((r) => r.authorUid).filter(Boolean))],
    [rows],
  );
  const avatarMap = useAuthorAvatarMap(rowAuthorUids);

  const navigateToProfile = useCallback(
    (uid: string) => {
      if (uid === user?.uid) {
        navigation.navigate('MainTabs', { screen: 'Profile' });
      } else {
        navigation.navigate('UserProfile', { userId: uid });
      }
    },
    [navigation, user?.uid],
  );

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
          {user?.uid ? (
            <View style={styles.userRateBlock}>
              <Text style={styles.userRateLabel}>{t('rating.yourRating')}</Text>
              <StarRating
                rating={userRating ?? 0}
                size={scale(16)}
                onRate={(value) => void onRate(value)}
              />
              {ratingBusy ? <ActivityIndicator color={colors.accentPurple} size="small" style={styles.rateSpinner} /> : null}
            </View>
          ) : null}
        </View>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(x) => `${x.postId}_${x.id}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('itemDetail.noComments')}</Text>}
        renderItem={({ item }) => {
          const avatar = profileImageDisplayUri(avatarMap[item.authorUid] ?? item.authorProfileImageUrl);
          return (
            <View style={styles.row}>
              <Pressable
                onPress={() => item.authorUid && navigateToProfile(item.authorUid)}
                disabled={!item.authorUid}
                style={({ pressed }) => [styles.authorPressable, pressed && item.authorUid && styles.authorPressed]}
              >
                {avatar ? <CachedImage uri={avatar} style={styles.avatar} /> : <View style={styles.avatar} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.author}>{item.authorName}</Text>
                  {item.kind === 'post' ? <Text style={styles.reviewBadge}>{t('itemDetail.reviewBadge')}</Text> : null}
                  {typeof item.rating === 'number' ? <StarRating rating={item.rating} size={scale(12)} /> : null}
                  <Text style={styles.comment}>{item.text}</Text>
                  <Text style={styles.time}>{formatRelativeTime(item.createdAtMs, appLocaleFromI18n(i18n.language))}</Text>
                </View>
              </Pressable>
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
  userRateBlock: { marginTop: spacingVertical.sm },
  userRateLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacingVertical.xxs },
  rateSpinner: { marginTop: spacingVertical.xxs },
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
  authorPressable: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  authorPressed: { opacity: 0.88 },
  avatar: { width: scale(34), height: scale(34), borderRadius: scale(17), backgroundColor: colors.surfaceElevated },
  author: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  reviewBadge: { ...typography.caption, color: colors.accentPurple, marginTop: spacingVertical.xxs },
  comment: { ...typography.body, color: colors.textSecondary, marginTop: spacingVertical.xs },
  time: { ...typography.meta, color: colors.textMuted, marginTop: spacingVertical.xs },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacingVertical.xl },
});

