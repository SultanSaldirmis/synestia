import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PostCard, ProfileImageZoomModal, ScreenSafeArea, LanguageSheet } from '../components';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useAuth } from '../context/AuthContext';
import { MOCK_USER } from '../data/mockData';
import type { FeedPost } from '../data/mockData';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useProfileScreenModel } from '../hooks/useProfileScreenModel';
import {
  addPostComment,
  createUserCollection,
  deletePost,
  deleteUserCollection,
  togglePostLike,
  updateUserProfileData,
  pruneOrphanUserLikes,
  type CollectionThemeType,
  type UserCollectionDoc,
  type UserLikeDoc,
} from '../services/firestoreService';
import { buildBookmarkPayloadFromPost } from '../utils/buildBookmarkPayload';
import { getCollectionTypeLabel } from '../utils/collectionLabels';
import { getCollectionDisplayName } from '../utils/collectionDisplayName';
import { appLocaleFromI18n, formatRelativeTime } from '../utils/formatRelativeTime';
import { profileImageDisplayUri } from '../utils/profileImage';
import { colors, radii, scale, spacing, spacingVertical, typography } from '../theme';

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const horizontalPad = spacing.lg;
const layoutWidth = Dimensions.get('window').width;
const collGridGap = scale(10);
const collTileW = Math.floor((layoutWidth - horizontalPad * 2 - collGridGap) / 2);
const NEW_COLL_TYPES: CollectionThemeType[] = ['film', 'music', 'book', 'mixed'];
const AVATAR = scale(88);
const tabSafeEdges = ['top', 'left', 'right', 'bottom'] as const;
const PROFILE_CARD_RADIUS = 25;

type ContentTab = 'posts' | 'likes' | 'likedCollection';

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const { t, i18n } = useTranslation();
  const { user, signOut, firebaseConfigured } = useAuth();
  const {
    profile,
    orderedUserPosts,
    likes,
    collections,
    contentRatings,
    nowMs,
  } = useProfileScreenModel(user?.uid, firebaseConfigured);
  const [contentTab, setContentTab] = useState<ContentTab>('posts');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newCollOpen, setNewCollOpen] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [newCollType, setNewCollType] = useState<CollectionThemeType>('mixed');
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [collSaving, setCollSaving] = useState(false);
  const collSavingRef = useRef(false);
  const likeBusyRef = useRef(new Set<string>());
  const { playTrack } = useMusicPlayer();

  const tabs = useMemo(
    (): { key: ContentTab; label: string }[] => [
      { key: 'posts', label: t('profile.posts') },
      { key: 'likes', label: t('profile.liked') },
      { key: 'likedCollection', label: t('profile.collections') },
    ],
    [t],
  );

  const displayName =
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    MOCK_USER.displayName;

  const handleSlug = useMemo(() => {
    const raw = user?.email?.split('@')[0] ?? displayName;
    return raw.toLowerCase().replace(/\s+/g, '');
  }, [displayName, user?.email]);

  const likedIds = useMemo(() => new Set(likes.map((l) => l.contentId)), [likes]);

  useEffect(() => {
    if (contentTab !== 'likes' || !user?.uid || !firebaseConfigured) return;
    void pruneOrphanUserLikes(user.uid).catch(() => {});
  }, [contentTab, firebaseConfigured, user?.uid]);

  const bioText = profile?.bio?.trim() || MOCK_USER.bio;
  const followers = profile?.followersCount ?? 0;
  const following = profile?.followingCount ?? 0;
  const collectionsStat = collections.length;

  const isPrivate = profile?.isPrivate === true;

  const onTogglePrivate = useCallback(
    async (v: boolean) => {
      if (!user?.uid) return;
      try {
        await updateUserProfileData(user.uid, { isPrivate: v });
      } catch {
        Alert.alert(t('common.error'), t('profile.settingsSaveFailed'));
      }
    },
    [user?.uid, t],
  );

  const saveNewCollection = useCallback(async () => {
    if (!user?.uid || collSavingRef.current) return;
    const n = newCollName.trim();
    if (!n) {
      Alert.alert(t('camera.nameRequired'), t('profile.collectionNamePrompt'));
      return;
    }
    collSavingRef.current = true;
    setCollSaving(true);
    try {
      await createUserCollection(user.uid, n, newCollType);
      setNewCollName('');
      setNewCollType('mixed');
      setNewCollOpen(false);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('collection.createFailed'));
    } finally {
      collSavingRef.current = false;
      setCollSaving(false);
    }
  }, [newCollName, newCollType, user?.uid, t]);

  const actorName =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || t('common.defaultUser');

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
        await addPostComment(item.id, user.uid, actorName, text, item.authorUid, item.title);
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
      if (!user?.uid) return;
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

  const confirmDeleteCollection = useCallback(
    (c: UserCollectionDoc) => {
      if (!user?.uid) return;
      Alert.alert(t('collection.deleteTitle'), t('collection.deleteMessage', { name: getCollectionDisplayName(c.name, t) }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteUserCollection(user.uid, c.id, user.uid);
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

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const avatarUri = profileImageDisplayUri(profile?.profileImageUrl);

  const openFollowers = useCallback(() => {
    if (user?.uid) navigation.navigate('FollowList', { mode: 'followers', userId: user.uid });
  }, [navigation, user?.uid]);

  const openFollowing = useCallback(() => {
    if (user?.uid) navigation.navigate('FollowList', { mode: 'following', userId: user.uid });
  }, [navigation, user?.uid]);

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

  const openLikedDetail = useCallback(
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

  return (
    <ScreenSafeArea edges={tabSafeEdges}>
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
      <View style={styles.screenHeader}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {handleSlug}
          </Text>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <View style={styles.headerActions}>
              <Pressable onPress={() => setSettingsOpen(true)} hitSlop={12} accessibilityLabel={t('profile.settings')}>
                <Ionicons name="ellipsis-vertical" size={scale(22)} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
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
                <Text style={styles.statValue}>{following}</Text>
                <Text style={styles.statLabel}>{t('profile.statFollowing')}</Text>
              </Pressable>
              <Pressable onPress={openFollowers} style={styles.statPress}>
                <Text style={styles.statValue}>{followers}</Text>
                <Text style={styles.statLabel}>{t('profile.statFollowers')}</Text>
              </Pressable>
              <Pressable onPress={() => setContentTab('likedCollection')} style={styles.statPress}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {collectionsStat}
                </Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  {t('profile.statCollections')}
                </Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.nameInCard}>{displayName}</Text>
          {bioText ? (
            <Text style={styles.bioInCard} numberOfLines={3}>
              {bioText}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
        >
          <Text style={styles.editBtnText}>{t('profile.editProfile')}</Text>
        </Pressable>

        <View style={styles.segmentOuter}>
          {tabs.map(({ key, label }) => {
            const active = contentTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setContentTab(key)}
                style={[styles.segmentPill, active && styles.segmentPillActive]}
              >
                <Text
                  style={[styles.segmentText, active && styles.segmentTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {contentTab === 'likedCollection' ? (
          <View style={styles.collectionsAddRow}>
            <Pressable
              onPress={() => setNewCollOpen(true)}
              hitSlop={10}
              accessibilityLabel={t('collection.createNew')}
              disabled={!firebaseConfigured || !user?.uid}
              style={({ pressed }) => [styles.collectionsAddBtn, pressed && styles.headerIconPressed]}
            >
              <Ionicons name="add-circle-outline" size={scale(22)} color={colors.accentPurple} />
              <Text style={styles.collectionsAddText}>{t('collection.add')}</Text>
            </Pressable>
          </View>
        ) : null}

        {contentTab === 'posts' ? (
          <View style={styles.postsList}>
            {orderedUserPosts.length === 0 ? (
              <Text style={styles.emptyLikes}>{t('profile.noPost')}</Text>
            ) : (
              orderedUserPosts.map((item, index) => (
                <PostCard
                  key={item.id}
                  title={item.title}
                  imageUrl={item.imageUrl}
                  authorName={item.authorName}
                  authorAvatarStored={item.authorProfileImageUrl ?? profile?.profileImageUrl}
                  category={item.category}
                  excerpt={item.excerpt}
                  timeLabel={formatRelativeTime(item.createdAtMs ?? item.createdAtClientMs ?? nowMs, appLocaleFromI18n(i18n.language))}
                  showThreadLine={index < orderedUserPosts.length - 1}
                  onPress={item.category === 'music' ? () => openPost(item) : undefined}
                  onPressComment={() => openCommentsDetail(item)}
                  contentId={user?.uid ? item.id : undefined}
                  liked={likedIds.has(item.id)}
                  onToggleLike={user?.uid && firebaseConfigured ? () => void handleToggleLike(item) : undefined}
                  likesCount={item.likesCount ?? 0}
                  commentCount={item.commentCount ?? 0}
                  onShare={() => sharePost(item)}
                  showOwnerDelete={Boolean(user?.uid && item.authorUid === user.uid && firebaseConfigured)}
                  onDeletePost={() => confirmDeletePost(item)}
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
        ) : null}

        {contentTab === 'likes' ? (
          <View style={styles.listBlock}>
            {!firebaseConfigured || !user?.uid ? (
              <Text style={styles.emptyLikes}>{t('profile.loginToLike')}</Text>
            ) : likes.length === 0 ? (
              <Text style={styles.emptyLikes}>{t('profile.noLikes')}</Text>
            ) : (
              likes.map((item) => (
                <Pressable
                  key={item.contentId}
                  onPress={() => openLikedDetail(item)}
                  style={({ pressed }) => [styles.likeRowSimple, pressed && styles.rowPressed]}
                >
                  <Text style={styles.likeRowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.likeRowMeta} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {contentTab === 'likedCollection' ? (
          <View style={styles.listBlock}>
            {!firebaseConfigured || !user?.uid ? (
              <Text style={styles.emptyLikes}>{t('common.loginRequired')}</Text>
            ) : collections.length === 0 ? (
              <Text style={styles.emptyLikes}>{t('profile.noCollectionsHint')}</Text>
            ) : (
              <View style={styles.collGrid}>
                {collections.map((c) => (
                  <View key={c.id} style={[styles.collTile, { width: collTileW }]}>
                    <Pressable
                      onPress={() => {
                        if (!user?.uid) return;
                        navigation.navigate('CollectionDetail', {
                          userId: user.uid,
                          collectionId: c.id,
                          collectionName: c.name,
                          collectionType: c.type,
                        });
                      }}
                      style={({ pressed }) => [styles.collTileInner, pressed && styles.rowPressed]}
                    >
                      <View style={styles.collTileIconWrap}>
                        <Ionicons name="folder-open" size={scale(28)} color={colors.accentPurple} />
                      </View>
                      <Text style={styles.collTileTitle} numberOfLines={2}>
                        {getCollectionDisplayName(c.name, t)}
                      </Text>
                      <Text style={styles.collTileMeta} numberOfLines={1}>
                        {getCollectionTypeLabel(t, c.type)} · {c.itemsCount}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDeleteCollection(c)}
                      hitSlop={10}
                      style={styles.collTileTrash}
                      accessibilityLabel={t('collection.options')}
                    >
                      <Ionicons name="ellipsis-vertical" size={scale(18)} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <Pressable
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
        >
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSettingsOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('profile.settings')}</Text>
          <View style={{ marginBottom: 12 }}>
            <LanguageSheet />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('profile.privateAccount')}</Text>
            <Switch
              value={isPrivate}
              onValueChange={onTogglePrivate}
              trackColor={{ false: colors.border, true: colors.tabActive }}
              thumbColor={colors.surface}
            />
          </View>
          <Text style={styles.switchHint}>
            {t('profile.privateAccountDesc')}
          </Text>
          <Pressable onPress={() => setSettingsOpen(false)} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={newCollOpen} transparent animationType="slide" onRequestClose={() => setNewCollOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setNewCollOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('collection.newTitle')}</Text>
          <TextInput
            style={styles.collInput}
            placeholder={t('collection.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={newCollName}
            onChangeText={setNewCollName}
          />
          <View style={styles.typeChips}>
            {NEW_COLL_TYPES.map((collType) => {
              const active = newCollType === collType;
              return (
                <Pressable
                  key={collType}
                  onPress={() => setNewCollType(collType)}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                    {getCollectionTypeLabel(t, collType)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => void saveNewCollection()}
            disabled={collSaving}
            style={({ pressed }) => [styles.modalPrimary, (collSaving || pressed) && styles.modalPrimaryDisabled]}
          >
            {collSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.modalPrimaryText}>{t('collection.create')}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setNewCollOpen(false)} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </Modal>

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
    paddingTop: spacingVertical.xs,
    paddingBottom: spacingVertical.xxl,
  },
  screenHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacingVertical.md },
  headerSide: { flex: 1 },
  headerSideRight: { alignItems: 'flex-end' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  headerIconPressed: { opacity: 0.75 },
  collectionsAddRow: { marginBottom: spacingVertical.sm, alignItems: 'flex-start' },
  collectionsAddBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacingVertical.xs },
  collectionsAddText: { ...typography.button, color: colors.accentPurple },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    flex: 2,
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
  statsCol: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: scale(4),
  },
  statPress: { alignItems: 'center', flex: 1, paddingVertical: spacingVertical.xs },
  statValue: { fontSize: scale(17), fontWeight: '700', color: colors.textPrimary },
  statLabel: {
    fontSize: scale(10),
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacingVertical.xxs,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  nameInCard: { fontSize: scale(22), fontWeight: '700', color: colors.textPrimary },
  bioInCard: { ...typography.body, color: colors.textSecondary, marginTop: spacingVertical.sm },
  editBtn: {
    alignItems: 'center',
    paddingVertical: spacingVertical.sm,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacingVertical.lg,
  },
  editBtnPressed: { opacity: 0.88 },
  editBtnText: { ...typography.button, color: colors.textPrimary },
  segmentOuter: { flexDirection: 'row', gap: scale(6), marginBottom: spacingVertical.md },
  segmentPill: {
    flex: 1,
    paddingVertical: spacingVertical.sm,
    paddingHorizontal: scale(4),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentPillActive: { backgroundColor: colors.tabActive },
  segmentText: { fontSize: scale(11), fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  segmentTextActive: { color: colors.tabSegmentTextActive },
  postsList: { marginBottom: spacingVertical.md },
  listBlock: { marginBottom: spacingVertical.lg },
  emptyLikes: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacingVertical.xl,
    width: '100%',
  },
  likeRowSimple: {
    backgroundColor: colors.surface,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacingVertical.sm,
  },
  likeRowTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '600' },
  likeRowMeta: { ...typography.meta, color: colors.accentPurple, marginTop: spacingVertical.xxs },
  collectionRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacingVertical.sm,
    overflow: 'hidden',
  },
  collectionRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minWidth: 0,
  },
  collectionTrash: { padding: spacing.md },
  collectionTitleStatic: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  collGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: collGridGap,
    marginTop: spacingVertical.xs,
  },
  collTile: {
    position: 'relative',
    marginBottom: spacingVertical.sm,
  },
  collTileInner: {
    backgroundColor: colors.surface,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: scale(118),
  },
  collTileIconWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingVertical.sm,
  },
  collTileTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: scale(14),
    minHeight: scale(36),
  },
  collTileMeta: { ...typography.meta, color: colors.textMuted, marginTop: spacingVertical.xxs },
  collTileTrash: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    padding: spacing.xxs,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacingVertical.md,
  },
  typeChip: {
    paddingVertical: spacingVertical.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  typeChipActive: { borderColor: colors.accentPurple, backgroundColor: colors.surface },
  typeChipText: { ...typography.caption, color: colors.textSecondary },
  typeChipTextActive: { color: colors.accentPurple, fontWeight: '700' },
  rowPressed: { opacity: 0.92 },
  logoutBtn: {
    marginTop: spacingVertical.md,
    paddingVertical: spacingVertical.sm,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
  },
  logoutPressed: { opacity: 0.88 },
  logoutText: { ...typography.button, color: colors.danger },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: '22%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.screenTitle, color: colors.textPrimary, marginBottom: spacingVertical.md },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingVertical.sm,
  },
  switchLabel: { ...typography.body, color: colors.textPrimary },
  switchHint: { ...typography.meta, color: colors.textMuted, marginBottom: spacingVertical.lg },
  modalClose: { alignItems: 'center', paddingVertical: spacingVertical.sm },
  modalCloseText: { ...typography.button, color: colors.textSecondary },
  collInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacingVertical.md,
  },
  modalPrimary: {
    backgroundColor: colors.profileAccent,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.sm,
    alignItems: 'center',
    marginBottom: spacingVertical.sm,
  },
  modalPrimaryText: { ...typography.button, color: '#ffffff', fontWeight: '700' },
  modalPrimaryDisabled: { opacity: 0.7 },
});
