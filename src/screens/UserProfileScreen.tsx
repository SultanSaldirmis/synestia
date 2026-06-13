import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PostCard, ProfileImageZoomModal, ScreenSafeArea } from '../components';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useAuth } from '../context/AuthContext';
import type { FeedPost } from '../data/mockData';
import type { AppStackParamList } from '../navigation/types';
import {
  addPostComment,
  createUserCollection,
  deletePost,
  deleteUserCollection,
  followUser,
  getUserProfileOnce,
  hasPendingFollowRequest,
  isFollowing,
  reportPost,
  subscribeUserCollections,
  subscribeUserLikes,
  subscribeUserPosts,
  subscribeUserProfile,
  togglePostLike,
  unfollowUser,
  updatePostText,
  getCatalogRatingsByRefs,
  type UserCollectionDoc,
  type UserLikeDoc,
  type UserProfileDoc,
} from '../services/firestoreService';
import { buildBookmarkPayloadFromPost } from '../utils/buildBookmarkPayload';
import { getCollectionDisplayName } from '../utils/collectionDisplayName';
import { appLocaleFromI18n, formatRelativeTime } from '../utils/formatRelativeTime';
import { profileImageDisplayUri } from '../utils/profileImage';
import { colors, radii, roundLayout, scale, spacing, spacingVertical, typography } from '../theme';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type R = RouteProp<AppStackParamList, 'UserProfile'>;

const horizontalPad = spacing.lg;
const AVATAR = scale(88);
const THUMB = roundLayout(scale(56));
const PROFILE_CARD_RADIUS = 25;

type TabKey = 'posts' | 'likes' | 'collections';

export function UserProfileScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { t, i18n } = useTranslation();
  const { userId } = route.params;
  const { user, firebaseConfigured } = useAuth();
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [tab, setTab] = useState<TabKey>('posts');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [likes, setLikes] = useState<UserLikeDoc[]>([]);
  const [collections, setCollections] = useState<UserCollectionDoc[]>([]);
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const likeBusyRef = useRef(new Set<string>());
  const [contentRatings, setContentRatings] = useState<Record<string, { averageRating: number; totalRatings: number }>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [newCollSaving, setNewCollSaving] = useState(false);
  const { playTrack } = useMusicPlayer();
  const orderedPosts = useMemo(
    () =>
      posts
        .slice()
        .sort(
          (a, b) =>
            (b.createdAtMs ?? b.createdAtClientMs ?? 0) - (a.createdAtMs ?? a.createdAtClientMs ?? 0),
        ),
    [posts],
  );

  const tabs = useMemo(
    (): { key: TabKey; label: string }[] => [
      { key: 'posts', label: t('profile.posts') },
      { key: 'likes', label: t('profile.liked') },
      { key: 'collections', label: t('profile.collections') },
    ],
    [t],
  );

  const isSelf = user?.uid === userId;

  useEffect(() => {
    if (!firebaseConfigured) return;
    return subscribeUserProfile(userId, setProfile);
  }, [firebaseConfigured, userId]);

  useEffect(() => {
    const refs = orderedPosts
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
  }, [orderedPosts]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return subscribeUserPosts(userId, setPosts);
  }, [firebaseConfigured, userId]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return subscribeUserLikes(userId, setLikes);
  }, [firebaseConfigured, userId]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return subscribeUserCollections(userId, setCollections);
  }, [firebaseConfigured, userId]);

  const refreshFollow = useCallback(async () => {
    if (!user?.uid || isSelf) return;
    const f = await isFollowing(user.uid, userId);
    const p = await hasPendingFollowRequest(user.uid, userId);
    setFollowing(f);
    setPending(p);
  }, [isSelf, user?.uid, userId]);

  useEffect(() => {
    void refreshFollow();
  }, [refreshFollow]);

  useEffect(() => {
    if (!user?.uid || !firebaseConfigured) {
      setLikedIds(new Set());
      return;
    }
    return subscribeUserLikes(user.uid, (likes) => {
      setLikedIds(new Set(likes.map((l) => l.contentId)));
    });
  }, [firebaseConfigured, user?.uid]);

  const displayName =
    profile?.displayName || profile?.email?.split('@')[0] || t('common.defaultUser');
  const isPrivate = profile?.isPrivate === true;
  const canView = isSelf || !isPrivate || following;

  const avatarUri = profileImageDisplayUri(profile?.profileImageUrl);
  const followers = profile?.followersCount ?? 0;
  const followingN = profile?.followingCount ?? 0;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refreshFollow().finally(() => setTimeout(() => setRefreshing(false), 1000));
  }, [refreshFollow]);

  const onFollowPress = useCallback(async () => {
    if (!user?.uid) {
      Alert.alert(t('post.loginRequired'), t('follow.loginRequired'));
      return;
    }
    setFollowBusy(true);
    try {
      if (following) {
        await unfollowUser(user.uid, userId);
        setFollowing(false);
        return;
      }
      const fromName =
        user.displayName || user.email?.split('@')[0] || t('common.defaultUser');
      const r = await followUser(user.uid, fromName, userId, isPrivate);
      if (r === 'requested') setPending(true);
      else setFollowing(true);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.actionFailed'));
    } finally {
      setFollowBusy(false);
    }
  }, [following, isPrivate, user, userId, t]);

  const openPost = useCallback(
    (item: FeedPost) => {
      if (item.category === 'music') {
        void playTrack({
          id: item.id,
          title: item.title,
          artist: item.attachedContent?.artistName ?? item.authorName,
          imageUrl: item.imageUrl,
          previewUrl: item.attachedContent?.previewUrl,
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

  const openLiked = useCallback(
    (item: UserLikeDoc) => {
      navigation.navigate('Detail', {
        id: item.contentId,
        title: item.title,
        category: item.category,
        description: item.subtitle || undefined,
        imageUrl: item.imageUrl,
        body: item.subtitle || item.title,
      });
    },
    [navigation],
  );

  const followLabel = following
    ? t('follow.unfollow')
    : pending
      ? t('follow.requestSent')
      : isPrivate
        ? t('follow.sendRequest')
        : t('follow.follow');

  const actorName = user?.displayName || user?.email?.split('@')[0] || t('common.defaultUser');

  const handleToggleLike = useCallback(
    async (item: FeedPost) => {
      if (!user?.uid) return;
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
      if (!user?.uid) return;
      const text = (drafts[item.id] ?? '').trim();
      if (!text) return;
      try {
        const p = await getUserProfileOnce(user.uid);
        await addPostComment(item.id, user.uid, actorName, text, item.authorUid, item.title, p?.profileImageUrl);
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
      if (!user?.uid || !isSelf) return;
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
    [isSelf, user?.uid, t],
  );

  const handleEditPost = useCallback(
    (item: FeedPost) => {
      if (!user?.uid || !isSelf) return;
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
      );
    },
    [isSelf, user?.uid, t],
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

  const confirmDeleteCollection = useCallback(
    (c: UserCollectionDoc) => {
      if (!user?.uid || !isSelf) return;
      Alert.alert(t('collection.deleteTitle'), t('collection.deleteMessage', { name: getCollectionDisplayName(c.name, t) }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteUserCollection(userId, c.id, user.uid);
              } catch (e) {
                Alert.alert(t('common.error'), e instanceof Error ? e.message : t('post.deleteFailed'));
              }
            })();
          },
        },
      ]);
    },
    [isSelf, user?.uid, userId, t],
  );

  const createNewCollection = useCallback(() => {
    if (!user?.uid || !isSelf) return;
    Alert.prompt?.(
      t('collection.newTitle'),
      t('collection.namePrompt'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('collection.create'),
          onPress: (name?: string) => {
            if (!name?.trim()) return;
            setNewCollSaving(true);
            void createUserCollection(user.uid, name.trim(), 'mixed')
              .then(() => {})
              .catch((e) => Alert.alert(t('common.error'), e instanceof Error ? e.message : t('collection.createFailed')))
              .finally(() => setNewCollSaving(false));
          },
        },
      ],
      'plain-text',
    ) ??
      Alert.alert(t('profile.collections'), t('collection.androidOnly'));
  }, [isSelf, user?.uid, t]);

  const openFollowers = useCallback(() => {
    navigation.navigate('FollowList', { mode: 'followers', userId });
  }, [navigation, userId]);

  const openFollowing = useCallback(() => {
    navigation.navigate('FollowList', { mode: 'following', userId });
  }, [navigation, userId]);

  const navigateToProfile = useCallback(
    (authorUid?: string) => {
      if (!authorUid || authorUid === userId) return;
      if (authorUid === user?.uid) {
        navigation.navigate('MainTabs', { screen: 'Profile' });
      } else {
        navigation.push('UserProfile', { userId: authorUid });
      }
    },
    [navigation, user?.uid, userId],
  );

  return (
    <ScreenSafeArea edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={scale(24)} color={colors.accentPurple} />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={{ width: scale(24) }} />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.topRow}>
            <Pressable
              onPress={() => avatarUri && setAvatarZoomOpen(true)}
              disabled={!avatarUri}
              style={styles.avatarWrap}
              accessibilityLabel={t('profile.zoomAvatar')}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </Pressable>
            <View style={styles.statsCol}>
              <Pressable onPress={openFollowing} style={styles.statPress}>
                <Text style={styles.statValue}>{followingN}</Text>
                <Text style={styles.statLabel}>{t('profile.statFollowing')}</Text>
              </Pressable>
              <Pressable onPress={openFollowers} style={styles.statPress}>
                <Text style={styles.statValue}>{followers}</Text>
                <Text style={styles.statLabel}>{t('profile.statFollowers')}</Text>
              </Pressable>
              <Pressable onPress={() => setTab('collections')} style={styles.statPress}>
                <Text style={styles.statValue}>{collections.length}</Text>
                <Text style={styles.statLabel}>{t('profile.statCollections')}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.nameInCard}>{displayName}</Text>
          {profile?.bio ? <Text style={styles.bioInCard}>{profile.bio}</Text> : null}
          {isPrivate ? (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed-outline" size={scale(14)} color={colors.textMuted} />
              <Text style={styles.privateBadgeText}> {t('profile.privateProfile')}</Text>
            </View>
          ) : null}
        </View>

        {/* Self-profile: show edit + collection buttons; other: show follow button */}
        {isSelf ? (
          <View style={styles.selfActions}>
            <Pressable
              onPress={() => navigation.navigate('EditProfile')}
              style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.editBtnText}>{t('profile.editProfile')}</Text>
            </Pressable>
            <Pressable
              onPress={createNewCollection}
              disabled={newCollSaving}
              style={({ pressed }) => [styles.addCollBtn, pressed && styles.btnPressed]}
            >
              {newCollSaving ? (
                <ActivityIndicator color={colors.accentPurple} size="small" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={scale(18)} color={colors.accentPurple} />
                  <Text style={styles.addCollBtnText}> {t('profile.collections')}</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => void onFollowPress()}
            disabled={followBusy || pending}
            style={({ pressed }) => [styles.followBtn, pressed && styles.btnPressed, pending && styles.followBtnPending]}
          >
            {followBusy ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <Text style={styles.followBtnText}>{followLabel}</Text>
            )}
          </Pressable>
        )}

        <View style={styles.segmentOuter}>
          {tabs.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.segmentPill, tab === key && styles.segmentPillActive]}
            >
              <Text style={[styles.segmentText, tab === key && styles.segmentTextActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {!canView && !isSelf ? (
          <View style={styles.wall}>
            <Ionicons name="lock-closed" size={scale(48)} color={colors.textMuted} />
            <Text style={styles.wallTitle}>{t('profile.privateWallTitle')}</Text>
            <Text style={styles.wallSub}>{t('profile.privateWallSub')}</Text>
          </View>
        ) : tab === 'posts' ? (
          <View style={styles.postsList}>
                {orderedPosts.length === 0 ? (
              <Text style={styles.empty}>{t('profile.noPost')}</Text>
            ) : (
                  orderedPosts.map((item, index) => (
                <PostCard
                  key={item.id}
                  title={item.title}
                  imageUrl={item.imageUrl}
                  authorName={item.authorName}
                  authorAvatarStored={item.authorProfileImageUrl ?? profile?.profileImageUrl}
                  category={item.category}
                  excerpt={item.excerpt}
                  timeLabel={formatRelativeTime(item.createdAtMs ?? item.createdAtClientMs ?? nowMs, appLocaleFromI18n(i18n.language))}
                  showThreadLine={index < orderedPosts.length - 1}
                  onPress={item.category === 'music' ? () => openPost(item) : undefined}
                  onAvatarPress={item.authorUid ? () => navigateToProfile(item.authorUid) : undefined}
                  onPressComment={() => openCommentsDetail(item)}
                  contentId={user?.uid ? item.id : undefined}
                  liked={likedIds.has(item.id)}
                  onToggleLike={user?.uid && firebaseConfigured ? () => void handleToggleLike(item) : undefined}
                  likesCount={item.likesCount ?? 0}
                  commentCount={item.commentCount ?? 0}
                  onShare={() => sharePost(item)}
                  showOwnerDelete={Boolean(isSelf && user?.uid && item.authorUid === userId && firebaseConfigured)}
                  onDeletePost={() => confirmDeletePost(item)}
                  onEditPost={isSelf ? () => handleEditPost(item) : undefined}
                  onReportPost={!isSelf && user?.uid ? () => handleReportPost(item) : undefined}
                  commentDraft={drafts[item.id] ?? ''}
                  onChangeCommentDraft={
                    user?.uid && firebaseConfigured
                      ? (t) => setDrafts((d) => ({ ...d, [item.id]: t }))
                      : undefined
                  }
                  onSubmitComment={user?.uid && firebaseConfigured ? () => submitComment(item) : undefined}
                  attachedContent={item.attachedContent}
                  onOpenAttachedContent={() => openGlobalItemDetail(item)}
                  enableBookmark={Boolean(user?.uid && firebaseConfigured)}
                  bookmarkPayload={buildBookmarkPayloadFromPost(item)}
                  postRating={item.rating}
                  location={item.location}
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
              ))
            )}
          </View>
        ) : tab === 'likes' ? (
          <View style={styles.listBlock}>
            {likes.length === 0 ? (
              <Text style={styles.empty}>{t('profile.noLikes')}</Text>
            ) : (
              likes.map((item) => (
                <Pressable
                  key={item.contentId}
                  onPress={() => openLiked(item)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={styles.listBlock}>
            {isSelf ? (
              <Pressable
                onPress={createNewCollection}
                disabled={newCollSaving}
                style={({ pressed }) => [styles.newCollRow, pressed && styles.btnPressed]}
              >
                <Ionicons name="add-circle-outline" size={scale(22)} color={colors.accentPurple} />
                <Text style={styles.newCollRowText}> {t('profile.createCollection')}</Text>
              </Pressable>
            ) : null}
            {collections.length === 0 ? (
              <Text style={styles.empty}>{t('profile.noCollections')}</Text>
            ) : (
              collections.map((c) => (
                <View key={c.id} style={styles.collectionRowOuter}>
                  <Pressable
                    onPress={() => {
                      if (!canView) return;
                      navigation.navigate('CollectionDetail', {
                        userId,
                        collectionId: c.id,
                        collectionName: c.name,
                        collectionType: c.type,
                      });
                    }}
                    disabled={!canView}
                    style={({ pressed }) => [styles.collectionRowMain, pressed && canView && { opacity: 0.92 }]}
                  >
                    <Ionicons name="folder-open-outline" size={THUMB / 2} color={colors.accentPurple} />
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {getCollectionDisplayName(c.name, t)}
                    </Text>
                  </Pressable>
                  {isSelf && user?.uid ? (
                    <Pressable
                      onPress={() => confirmDeleteCollection(c)}
                      hitSlop={10}
                      style={styles.collectionTrash}
                      accessibilityLabel={t('collection.delete')}
                    >
                      <Ionicons name="ellipsis-vertical" size={scale(20)} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <ProfileImageZoomModal
        visible={avatarZoomOpen}
        imageUri={avatarUri}
        onClose={() => setAvatarZoomOpen(false)}
      />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: horizontalPad,
    paddingBottom: spacingVertical.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingVertical.md,
    paddingTop: spacingVertical.xs,
  },
  topTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: PROFILE_CARD_RADIUS,
    padding: spacing.lg,
    marginBottom: spacingVertical.md,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacingVertical.md },
  avatarWrap: { marginRight: spacing.md },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.surfaceElevated,
  },
  avatarFallback: {
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: scale(36), fontWeight: '700', color: colors.accentPurple },
  statsCol: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: scale(4) },
  statPress: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: scale(17), fontWeight: '700', color: colors.textPrimary },
  statLabel: {
    fontSize: scale(10),
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacingVertical.xxs,
  },
  nameInCard: { fontSize: scale(22), fontWeight: '700', color: colors.textPrimary },
  bioInCard: { ...typography.body, color: colors.textSecondary, marginTop: spacingVertical.sm },
  privateBadge: { flexDirection: 'row', alignItems: 'center', marginTop: spacingVertical.sm },
  privateBadgeText: { ...typography.meta, color: colors.textMuted },
  /* Self-profile action row */
  selfActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacingVertical.lg,
  },
  editBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacingVertical.sm,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
  },
  editBtnText: { ...typography.button, color: colors.textPrimary },
  addCollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingVertical.sm,
    paddingHorizontal: spacing.md,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.accentPurple,
  },
  addCollBtnText: { ...typography.button, color: colors.accentPurple, fontSize: scale(13) },
  btnPressed: { opacity: 0.88 },
  followBtn: {
    backgroundColor: colors.profileAccent,
    paddingVertical: spacingVertical.sm,
    borderRadius: scale(12),
    alignItems: 'center',
    marginBottom: spacingVertical.lg,
  },
  followBtnPending: { opacity: 0.65 },
  followBtnText: { ...typography.button, color: '#ffffff', fontWeight: '700' },
  segmentOuter: { flexDirection: 'row', gap: scale(6), marginBottom: spacingVertical.md },
  segmentPill: {
    flex: 1,
    paddingVertical: spacingVertical.sm,
    borderRadius: scale(20),
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentPillActive: { backgroundColor: colors.tabActive },
  segmentText: { fontSize: scale(11), fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  segmentTextActive: { color: colors.tabSegmentTextActive },
  wall: {
    alignItems: 'center',
    paddingVertical: spacingVertical.xxl,
    paddingHorizontal: spacing.lg,
  },
  wallTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginTop: spacingVertical.md,
  },
  wallSub: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacingVertical.sm },
  postsList: { marginBottom: spacingVertical.md },
  listBlock: { marginBottom: spacingVertical.lg },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacingVertical.xl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacingVertical.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collectionRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacingVertical.sm,
    overflow: 'hidden',
  },
  collectionRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minWidth: 0,
  },
  collectionTrash: { padding: spacing.md },
  newCollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingVertical.md,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.accentPurple,
    marginBottom: spacingVertical.md,
  },
  newCollRowText: { ...typography.button, color: colors.accentPurple },
  rowTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  rowMeta: { ...typography.meta, color: colors.accentPurple },
});
