import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ListRenderItem,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PostCard, ScreenSafeArea } from '../components';
import { useDrawer } from '../navigation/DrawerNavigator';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import type { FeedPost } from '../data/mockData';
import { MOCK_FEED } from '../data/mockData';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import {
  addPostComment,
  deletePost,
  getUserProfileOnce,
  reportPost,
  subscribeFeedPostsForHome,
  subscribeUserLikes,
  togglePostLike,
  updatePostText,
  getCatalogRatingsByRefs,
} from '../services/firestoreService';
import { buildBookmarkPayloadFromPost } from '../utils/buildBookmarkPayload';
import { appLocaleFromI18n, formatRelativeTime } from '../utils/formatRelativeTime';
import { colors, roundLayout, scale, spacing, spacingVertical, typography } from '../theme';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width: windowWidth } = Dimensions.get('window');
const listHorizontalPad = roundLayout(Math.min(scale(20), windowWidth * 0.06));
const BRAND_IMAGE = require('../assets/synestia_background.png');

const safeEdges = ['top', 'left', 'right', 'bottom'] as const;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const [feedReady, setFeedReady] = useState(false);
  const [fsPosts, setFsPosts] = useState<FeedPost[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [contentRatings, setContentRatings] = useState<Record<string, { averageRating: number; totalRatings: number }>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const flatListRef = useRef<FlatList<FeedPost> | null>(null);
  const likeBusyRef = useRef(new Set<string>());
  const { playTrack } = useMusicPlayer();

  useEffect(() => {
    const t = setTimeout(() => setFeedReady(true), Platform.OS === 'android' ? 700 : 500);
    return () => clearTimeout(t);
  }, []);

  const unsubFeedRef = useRef<(() => void) | null>(null);

  const subscribeFeed = useCallback(() => {
    unsubFeedRef.current?.();
    if (!isFirebaseConfigured()) return;
    unsubFeedRef.current = subscribeFeedPostsForHome(user?.uid ?? null, setFsPosts);
  }, [user?.uid]);

  useEffect(() => {
    subscribeFeed();
    return () => unsubFeedRef.current?.();
  }, [subscribeFeed]);

  useFocusEffect(
    useCallback(() => {
      subscribeFeed();
      return () => {};
    }, [subscribeFeed]),
  );

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.uid || !isFirebaseConfigured()) {
      setLikedIds(new Set());
      return;
    }
    return subscribeUserLikes(user.uid, (likes) => {
      setLikedIds(new Set(likes.map((l) => l.contentId)));
    });
  }, [user?.uid]);

  const posts = (isFirebaseConfigured() && fsPosts.length > 0 ? fsPosts : MOCK_FEED)
    .slice()
    .sort(
      (a, b) =>
        (b.createdAtMs ?? b.createdAtClientMs ?? 0) - (a.createdAtMs ?? a.createdAtClientMs ?? 0),
    );

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [posts[0]?.id]);

  useEffect(() => {
    const refs = posts
      .map((p) => {
        if (p.attachedContent?.type === 'book') return { kind: 'book' as const, id: p.attachedContent.id };
        if (p.attachedContent?.type === 'movie') {
          return { kind: 'movie' as const, id: p.attachedContent.id.replace(/^tmdb_/, '') };
        }
        if (p.category === 'book') return { kind: 'book' as const, id: p.id };
        if (p.category === 'movie') return { kind: 'movie' as const, id: p.id.replace(/^tmdb_/, '') };
        return null;
      })
      .filter((x): x is { kind: 'book' | 'movie'; id: string } => Boolean(x?.id));
    if (refs.length === 0) {
      setContentRatings({});
      return;
    }
    void getCatalogRatingsByRefs(refs).then(setContentRatings).catch(() => {});
  }, [posts]);

  const actorName = user?.displayName || user?.email?.split('@')[0] || t('common.defaultUser');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    subscribeFeed();
    setTimeout(() => setRefreshing(false), 1200);
  }, [subscribeFeed]);

  const openDetail = useCallback(
    (item: FeedPost) => {
      if (item.category === 'music') {
        const preview = item.attachedContent?.previewUrl;
        void playTrack({
          id: item.id,
          title: item.title,
          artist: item.attachedContent?.artistName ?? item.authorName,
          imageUrl: item.imageUrl,
          previewUrl: preview,
          externalUrl: item.attachedContent?.externalUrl,
          detail: {
            id: item.id,
            title: item.title,
            category: 'music',
            description: item.excerpt,
            imageUrl: item.imageUrl,
            body: item.excerpt,
            authorUid: item.authorUid,
            authorName: item.authorName,
            commentCount: item.commentCount,
          },
        });
        navigation.navigate('MusicPlayer');
        return;
      }
      navigation.navigate('Detail', {
        id: item.id,
        title: item.title,
        category: item.category,
        description: undefined,
        imageUrl: item.imageUrl,
        body: item.excerpt,
        authorUid: item.authorUid,
        authorName: item.authorName,
        commentCount: item.commentCount,
      });
    },
    [navigation],
  );

  const openGlobalItemDetail = useCallback(
    (item: FeedPost) => {
      const ac = item.attachedContent;
      if (!ac) return;
      if (ac.type !== 'book' && ac.type !== 'movie') return;
      navigation.navigate('ItemDetail', {
        itemType: ac.type,
        itemId: ac.id,
        title: ac.title || item.title,
        imageUrl: ac.imageUrl || item.imageUrl,
      });
    },
    [navigation],
  );

  const openCommentsDetail = useCallback(
    (item: FeedPost) => {
      navigation.navigate('Detail', {
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.excerpt,
        imageUrl: item.imageUrl,
        body: item.excerpt,
        authorUid: item.authorUid,
        authorName: item.authorName,
        commentCount: item.commentCount,
      });
    },
    [navigation],
  );

  const handleToggleLike = useCallback(
    async (item: FeedPost) => {
      if (!user?.uid) {
        Alert.alert(t('post.loginRequired'), t('post.loginRequiredLike'));
        return;
      }
      if (likeBusyRef.current.has(item.id)) return;
      likeBusyRef.current.add(item.id);
      try {
        await togglePostLike(user.uid, actorName, {
          id: item.id,
          title: item.title,
          imageUrl: item.imageUrl,
          category: item.category,
          authorName: item.authorName,
          authorUid: item.authorUid,
          excerpt: item.excerpt,
        });
      } catch {
        Alert.alert(t('common.error'), t('post.likeFailed'));
      } finally {
        likeBusyRef.current.delete(item.id);
      }
    },
    [actorName, user?.uid, t],
  );

  const submitComment = useCallback(
    async (item: FeedPost) => {
      if (!user?.uid) {
        Alert.alert(t('post.loginRequired'), t('post.loginRequiredComment'));
        return;
      }
      const text = (drafts[item.id] ?? '').trim();
      if (!text) return;
      try {
        const profile = await getUserProfileOnce(user.uid);
        await addPostComment(item.id, user.uid, actorName, text, item.authorUid, item.title, profile?.profileImageUrl);
        setDrafts((d) => ({ ...d, [item.id]: '' }));
      } catch {
        Alert.alert(t('common.error'), t('post.commentFailed'));
      }
    },
    [actorName, drafts, user?.uid, t],
  );

  const sharePost = useCallback((item: FeedPost) => {
    void Share.share({
      message: `${item.title}\n\n${item.excerpt}`.trim().slice(0, 2000),
    });
  }, []);

  const confirmDeletePost = useCallback(
    (item: FeedPost) => {
      if (!user?.uid || item.authorUid !== user.uid) return;
      Alert.alert(t('post.deleteTitle'), t('post.deleteMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deletePost(item.id, user.uid);
              } catch (e) {
                Alert.alert(t('common.error'), e instanceof Error ? e.message : t('post.deleteFailed'));
              }
            })();
          },
        },
      ]);
    },
    [user?.uid, t],
  );

  const handleEditPost = useCallback(
    (item: FeedPost) => {
      if (!user?.uid || item.authorUid !== user.uid) return;
      Alert.prompt?.(
        t('post.editTitle'),
        undefined,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.save'),
            onPress: (newText?: string) => {
              if (!newText?.trim()) return;
              void updatePostText(item.id, user.uid, newText).catch((e) =>
                Alert.alert(t('common.error'), e instanceof Error ? e.message : t('post.editFailed')),
              );
            },
          },
        ],
        'plain-text',
        item.excerpt,
      ) ??
        Alert.alert(t('common.edit'), t('post.editIosOnly'));
    },
    [user?.uid, t],
  );

  const handleReportPost = useCallback(
    (item: FeedPost) => {
      if (!user?.uid) return;
      Alert.alert(t('post.reportTitle'), t('post.reportMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('post.report'),
          style: 'destructive',
          onPress: () => {
            void reportPost(item.id, user.uid, 'Uygunsuz içerik')
              .then(() => Alert.alert(t('common.thanks'), t('post.reportSent')))
              .catch(() => Alert.alert(t('common.error'), t('post.reportFailed')));
          },
        },
      ]);
    },
    [user?.uid, t],
  );

  const navigateToProfile = useCallback(
    (authorUid?: string) => {
      if (!authorUid) return;
      if (authorUid === user?.uid) {
        navigation.navigate('MainTabs', { screen: 'Profile' });
      } else {
        navigation.navigate('UserProfile', { userId: authorUid });
      }
    },
    [navigation, user?.uid],
  );

  const renderItem: ListRenderItem<FeedPost> = useCallback(
    ({ item, index }) => (
      <PostCard
        title={item.title}
        imageUrl={item.imageUrl}
        authorName={item.authorName}
        authorAvatarStored={item.authorProfileImageUrl}
        category={item.category}
        excerpt={item.excerpt}
        timeLabel={formatRelativeTime(item.createdAtMs ?? item.createdAtClientMs ?? nowMs, appLocaleFromI18n(i18n.language))}
        showThreadLine={index < posts.length - 1}
        onPress={item.category === 'music' ? () => openDetail(item) : undefined}
        onAvatarPress={item.authorUid ? () => navigateToProfile(item.authorUid) : undefined}
        onPressComment={() => openCommentsDetail(item)}
        contentId={user?.uid ? item.id : undefined}
        liked={likedIds.has(item.id)}
        onToggleLike={user?.uid ? () => void handleToggleLike(item) : undefined}
        likesCount={item.likesCount ?? 0}
        commentCount={item.commentCount ?? 0}
        onShare={() => sharePost(item)}
        showOwnerDelete={
          Boolean(user?.uid && item.authorUid === user.uid && isFirebaseConfigured() && fsPosts.some((p) => p.id === item.id))
        }
        onDeletePost={() => confirmDeletePost(item)}
        onEditPost={() => handleEditPost(item)}
        onReportPost={user?.uid && item.authorUid !== user.uid ? () => handleReportPost(item) : undefined}
        commentDraft={drafts[item.id] ?? ''}
        onChangeCommentDraft={
          user?.uid && isFirebaseConfigured()
            ? (t) => setDrafts((d) => ({ ...d, [item.id]: t }))
            : undefined
        }
        onSubmitComment={user?.uid && isFirebaseConfigured() ? () => submitComment(item) : undefined}
        attachedContent={item.attachedContent}
        onOpenAttachedContent={() => openGlobalItemDetail(item)}
        enableBookmark={Boolean(user?.uid && isFirebaseConfigured())}
        bookmarkPayload={buildBookmarkPayloadFromPost(item)}
        postRating={item.rating}
        averageRating={
          item.attachedContent?.type === 'book'
            ? contentRatings[`book:${item.attachedContent.id}`]?.averageRating
            : item.attachedContent?.type === 'movie'
              ? contentRatings[`movie:${item.attachedContent.id.replace(/^tmdb_/, '')}`]?.averageRating
              : item.category === 'book'
                ? contentRatings[`book:${item.id}`]?.averageRating
                : item.category === 'movie'
                  ? contentRatings[`movie:${item.id.replace(/^tmdb_/, '')}`]?.averageRating
                  : undefined
        }
        totalRatings={
          item.attachedContent?.type === 'book'
            ? contentRatings[`book:${item.attachedContent.id}`]?.totalRatings
            : item.attachedContent?.type === 'movie'
              ? contentRatings[`movie:${item.attachedContent.id.replace(/^tmdb_/, '')}`]?.totalRatings
              : item.category === 'book'
                ? contentRatings[`book:${item.id}`]?.totalRatings
                : item.category === 'movie'
                  ? contentRatings[`movie:${item.id.replace(/^tmdb_/, '')}`]?.totalRatings
                  : undefined
        }
      />
    ),
    [
      confirmDeletePost,
      contentRatings,
      drafts,
      fsPosts,
      handleEditPost,
      handleReportPost,
      handleToggleLike,
      likedIds,
      navigateToProfile,
      openCommentsDetail,
      openGlobalItemDetail,
      openDetail,
      posts.length,
      sharePost,
      submitComment,
      user?.uid,
      nowMs,
      i18n.language,
      t,
    ],
  );

  const keyExtractor = useCallback((item: FeedPost) => item.id, []);

  if (!feedReady) {
    return (
      <ScreenSafeArea edges={safeEdges}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accentPurple} />
          <Text style={styles.loadingText}>{t('home.loading')}</Text>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea edges={safeEdges}>
      <View style={styles.wrap}>
        <View style={styles.brandHeader}>
          <Image source={BRAND_IMAGE} style={styles.brandLogo} resizeMode="cover" />
          <Text style={styles.brandTitle}>Synestia</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={openDrawer}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.hamburgerBtn}
          >
            <Ionicons name="menu" size={scale(26)} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: listHorizontalPad, paddingBottom: spacingVertical.xxl + scale(56) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentPurple}
              colors={[colors.accentPurple]}
              progressBackgroundColor={colors.surface}
            />
          }
        />
        {isFirebaseConfigured() && user?.uid ? (
          <Pressable
            style={styles.fab}
            onPress={() => navigation.navigate('CreatePost')}
            accessibilityLabel={t('post.createFab')}
          >
            <Ionicons name="create-outline" size={scale(28)} color="#ffffff" />
          </Pressable>
        ) : null}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: listHorizontalPad,
    paddingTop: spacingVertical.xs,
    paddingBottom: spacingVertical.xs,
  },
  brandLogo: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
  },
  brandTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  hamburgerBtn: {
    padding: spacing.xs,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacingVertical.md,
  },
  listContent: { flexGrow: 1, paddingTop: spacingVertical.sm },
  fab: {
    position: 'absolute',
    right: listHorizontalPad,
    bottom: spacingVertical.lg,
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: colors.profileAccent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
});
