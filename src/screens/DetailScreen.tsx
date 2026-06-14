import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CachedImage, ScreenSafeArea, StarRating } from '../components';
import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList, AppStackParamList } from '../navigation/types';
import {
  addPostComment,
  deletePost,
  deletePostComment,
  getCatalogRatingsByRefs,
  getUserProfileOnce,
  subscribePostById,
  subscribePostComments,
  subscribeUserLikes,
  togglePostLike,
  type PostCommentDoc,
} from '../services/firestoreService';
import type { FeedPost } from '../data/mockData';
import { profileImageDisplayUri } from '../utils/profileImage';
import { localizeMomentExcerpt } from '../utils/localizeMomentText';
import { openExternalMap } from '../utils/openExternalMap';
import { useAuthorAvatarMap } from '../hooks/useAuthorAvatarMap';
import { colors, radii, roundLayout, scale, spacing, spacingVertical, typography, verticalScale } from '../theme';

type DetailRoute = RouteProp<RootStackParamList, 'Detail'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;


export function DetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const { t } = useTranslation();
  const {
    title,
    category,
    id,
    description,
    imageUrl,
    body,
    authorUid,
    authorName: routeAuthorName,
    commentCount: routeCommentCount,
  } = route.params;
  const { user, firebaseConfigured } = useAuth();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [liked, setLiked] = useState(false);
  const [livePost, setLivePost] = useState<FeedPost | null>(null);
  const [postResolved, setPostResolved] = useState(!isFirebaseConfigured());
  const missingHandledRef = useRef(false);
  const [comments, setComments] = useState<PostCommentDoc[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentSubmittingRef = useRef(false);
  const likeBusyRef = useRef(false);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<PostCommentDoc | null>(null);
  const [catalogRating, setCatalogRating] = useState<{ averageRating: number; totalRatings: number } | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const { width: windowWidth } = Dimensions.get('window');
  const heroHeight = roundLayout(Math.min(verticalScale(240), windowWidth * 0.58));

  const displayTitle = livePost?.title ?? title;
  const displayImageUrl = livePost?.imageUrl ?? imageUrl;
  const displayCategory = livePost?.category ?? category;
  const displayAuthorName = livePost?.authorName ?? routeAuthorName;
  const displayDescription = livePost?.excerpt ?? description;
  const displayBody = livePost?.excerpt ?? body ?? description;
  const postAuthorUid = livePost?.authorUid ?? authorUid;
  const postLocation = livePost?.location;
  const locationLabel = postLocation
    ? postLocation.name?.trim() ||
      `${postLocation.latitude.toFixed(5)}, ${postLocation.longitude.toFixed(5)}`
    : null;

  const detailTextRaw =
    displayBody ?? 'Bu içerik için henüz açıklama eklenmedi.';
  const detailText =
    displayCategory === 'moment' ? localizeMomentExcerpt(detailTextRaw, t) : detailTextRaw;
  const localizedTitle =
    displayCategory === 'moment' ? localizeMomentExcerpt(displayTitle, t) : displayTitle;
  const localizedDescription =
    displayCategory === 'moment'
      ? localizeMomentExcerpt(displayDescription ?? '', t)
      : (displayDescription ?? '').trim();
  const normalizedBody = detailText.trim();
  const showTagline =
    Boolean(localizedDescription) &&
    localizedDescription !== normalizedBody &&
    localizedDescription !== localizedTitle;
  const hideBodyDuplicate =
    displayCategory === 'moment' && normalizedBody === localizedTitle;
  const titleMatchesLocation = Boolean(
    postLocation && locationLabel && localizedTitle === locationLabel,
  );
  const showPrimaryTitle = !titleMatchesLocation;
  const isText =
    displayCategory === 'text' || (!displayImageUrl?.trim() && !postLocation);

  useLayoutEffect(() => {
    navigation.setOptions({ title: localizedTitle });
  }, [navigation, localizedTitle]);

  const actorName = user?.displayName || user?.email?.split('@')[0] || t('common.defaultUser');

  useEffect(() => {
    if (!user?.uid || !firebaseConfigured) {
      setLiked(false);
      return;
    }
    return subscribeUserLikes(user.uid, (likes) => {
      setLiked(likes.some((l) => l.contentId === id));
    });
  }, [firebaseConfigured, id, user?.uid]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardInset(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    missingHandledRef.current = false;
    setPostResolved(false);
    return subscribePostById(id, setLivePost, () => setPostResolved(true));
  }, [id]);

  useEffect(() => {
    if (!firebaseConfigured || !postResolved || livePost !== null) return;
    if (missingHandledRef.current) return;
    missingHandledRef.current = true;
    Alert.alert(t('common.error'), t('post.notFound'), [
      { text: t('common.close'), onPress: () => navigation.goBack() },
    ]);
  }, [firebaseConfigured, livePost, navigation, postResolved, t]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return subscribePostComments(id, setComments);
  }, [id]);

  const commentAuthorUids = useMemo(
    () => [...new Set(comments.map((c) => c.authorUid).filter(Boolean))],
    [comments],
  );
  const avatarMap = useAuthorAvatarMap(commentAuthorUids);

  const commentCount = livePost?.commentCount ?? routeCommentCount ?? 0;
  const likesCountLive = livePost?.likesCount ?? 0;
  const canDeletePost =
    Boolean(firebaseConfigured && user?.uid && postAuthorUid && user.uid === postAuthorUid);
  const catalogRef =
    displayCategory === 'book'
      ? {
          kind: 'book' as const,
          id: livePost?.attachedContent?.type === 'book' ? livePost.attachedContent.id : id,
        }
      : displayCategory === 'movie'
        ? {
            kind: 'movie' as const,
            id: livePost?.attachedContent?.type === 'movie' ? livePost.attachedContent.id : id.replace(/^tmdb_/, ''),
          }
        : null;

  useEffect(() => {
    if (!catalogRef) {
      setCatalogRating(null);
      return;
    }
    void getCatalogRatingsByRefs([catalogRef]).then((map) => {
      const key = `${catalogRef.kind}:${catalogRef.id}`;
      setCatalogRating(map[key] ?? null);
    });
  }, [catalogRef]);

  // Do not hide comments behind parent filtering; render all in chronological order.

  const onToggleLike = useCallback(async () => {
    if (likeBusyRef.current) return;
    if (!user?.uid) {
      Alert.alert(t('post.loginRequired'), t('post.loginRequiredLike'));
      return;
    }
    likeBusyRef.current = true;
    setLikeSubmitting(true);
    try {
      const next = await togglePostLike(user.uid, actorName, {
        id,
        title: displayTitle,
        imageUrl: displayImageUrl ?? '',
        category: displayCategory,
        authorName: displayAuthorName ?? displayDescription,
        authorUid: postAuthorUid,
        excerpt: displayDescription ?? displayBody,
      });
      setLiked(next);
    } catch {
      Alert.alert(t('common.error'), t('post.likeFailed'));
    } finally {
      likeBusyRef.current = false;
      setLikeSubmitting(false);
    }
  }, [actorName, displayAuthorName, displayBody, displayCategory, displayDescription, displayImageUrl, displayTitle, id, postAuthorUid, user?.uid, t]);

  const sendComment = useCallback(async () => {
    if (commentSubmittingRef.current) return;
    if (!user?.uid) {
      Alert.alert(t('post.loginRequired'), t('post.loginRequiredComment'));
      return;
    }
    const text = commentText.trim();
    if (!text) return;
    commentSubmittingRef.current = true;
    setCommentSubmitting(true);
    try {
      const profile = await getUserProfileOnce(user.uid);
      await addPostComment(
        id,
        user.uid,
        actorName,
        text,
        postAuthorUid,
        title,
        profile?.profileImageUrl,
        replyTo?.id,
      );
      setCommentText('');
      setReplyTo(null);
    } catch {
      Alert.alert(t('common.error'), t('post.commentFailed'));
    } finally {
      commentSubmittingRef.current = false;
      setCommentSubmitting(false);
    }
  }, [actorName, commentText, id, postAuthorUid, replyTo, title, user?.uid, t]);

  const onShareDetail = useCallback(() => {
    void Share.share({
      message: `${title}\n\n${detailText}`.trim().slice(0, 2000),
    });
  }, [detailText, title]);

  const onDeletePost = useCallback(() => {
    if (!user?.uid || !canDeletePost) return;
    Alert.alert(t('post.deleteTitle'), t('post.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deletePost(id, user.uid);
              navigation.goBack();
            } catch (e) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('post.deleteFailed'));
            }
          })();
        },
      },
    ]);
  }, [canDeletePost, id, navigation, user?.uid, t]);

  const onDeleteComment = useCallback(
    (c: PostCommentDoc) => {
      if (!user?.uid || c.authorUid !== user.uid) return;
      Alert.alert(t('post.deleteCommentTitle'), t('post.deleteCommentMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deletePostComment(id, c.id, user.uid);
              } catch (e) {
                Alert.alert(t('common.error'), e instanceof Error ? e.message : t('post.deleteFailed'));
              }
            })();
          },
        },
      ]);
    },
    [id, user?.uid, t],
  );

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

  const renderComment = (c: PostCommentDoc) => {
    const isReply = Boolean(c.parentId);
    const avatarUri = profileImageDisplayUri(avatarMap[c.authorUid] ?? c.authorProfileImageUrl);
    return (
      <View key={c.id}>
        <View style={[styles.commentThreadRow, isReply && styles.commentReplyIndent]}>
          <View style={styles.commentAvatarCol}>
            <Pressable onPress={() => navigateToProfile(c.authorUid)}>
              {avatarUri ? (
                <CachedImage uri={avatarUri} style={styles.commentAvatarImg} />
              ) : (
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{c.authorName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </Pressable>
            {isReply ? <View style={styles.commentThreadLine} /> : null}
          </View>
          <View style={styles.commentContentCol}>
            <View style={styles.commentHeader}>
              <Pressable onPress={() => navigateToProfile(c.authorUid)} style={{ flex: 1 }}>
                <Text style={styles.commentAuthor} numberOfLines={1}>
                  {c.authorName}
                </Text>
              </Pressable>
              <View style={styles.commentActions}>
                {user?.uid ? (
                  <Pressable
                    onPress={() => {
                      setReplyTo(c);
                      setCommentText(`@${c.authorName} `);
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.replyBtn}>{t('post.reply')}</Text>
                  </Pressable>
                ) : null}
                {user?.uid === c.authorUid ? (
                  <Pressable onPress={() => onDeleteComment(c)} hitSlop={8} accessibilityLabel={t('post.deleteComment')}>
                    <Ionicons name="trash-outline" size={scale(16)} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <Text style={styles.commentBody}>{c.text}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenSafeArea edges={['left', 'right', 'bottom']}>
      {firebaseConfigured && !postResolved ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accentPurple} />
        </View>
      ) : firebaseConfigured && postResolved && !livePost ? (
        <View style={styles.loadingWrap} />
      ) : (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            firebaseConfigured && user?.uid && Platform.OS === 'ios'
              ? { paddingBottom: spacingVertical.xxl + scale(120) }
              : null,
            Platform.OS === 'android' && keyboardInset > 0
              ? { paddingBottom: keyboardInset + spacingVertical.lg }
              : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isText && displayImageUrl?.trim() ? (
            <CachedImage
              uri={displayImageUrl}
              style={[styles.hero, { height: heroHeight }]}
            />
          ) : postLocation ? (
            <MapView
              style={[styles.hero, { height: heroHeight }]}
              region={{
                ...postLocation,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={postLocation} pinColor={colors.accentPurple} />
            </MapView>
          ) : isText ? (
            <View style={[styles.textHero, { height: heroHeight }]}>
              <Ionicons name="document-text-outline" size={scale(56)} color={colors.accentPurple} />
            </View>
          ) : null}

          <View style={styles.block}>
            <View style={styles.titleRow}>
              {displayAuthorName ? (
                <Pressable onPress={() => postAuthorUid && navigateToProfile(postAuthorUid)} style={{ flex: 1 }}>
                  <Text style={styles.authorHint} numberOfLines={1}>
                    {displayAuthorName}
                  </Text>
                </Pressable>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              {canDeletePost ? (
                <Pressable onPress={onDeletePost} hitSlop={10} accessibilityLabel={t('post.deleteTitle')}>
                  <Ionicons name="trash-outline" size={scale(22)} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            {showPrimaryTitle ? <Text style={styles.title}>{localizedTitle}</Text> : null}
            {catalogRef ? (
              <View style={styles.bookRatingRow}>
                {typeof catalogRating?.averageRating === 'number' ? (
                  <StarRating
                    rating={catalogRating.averageRating}
                    totalRatings={catalogRating.totalRatings ?? 0}
                  />
                ) : (
                  <Text style={styles.unratedText}>{t('rating.notRatedYet')}</Text>
                )}
              </View>
            ) : null}
            {showTagline ? <Text style={styles.tagline}>{localizedDescription}</Text> : null}
            {postLocation && locationLabel ? (
              <Pressable
                onPress={() =>
                  void openExternalMap(
                    postLocation.latitude,
                    postLocation.longitude,
                    postLocation.name,
                    t('post.mapsOpenFailed'),
                  )
                }
                style={({ pressed }) => [styles.locationLinkRow, pressed && styles.locationLinkPressed]}
                accessibilityRole="link"
                accessibilityLabel={t('post.openInMaps', { label: locationLabel })}
              >
                <Ionicons name="location" size={scale(titleMatchesLocation ? 22 : 18)} color={colors.accentPurple} />
                <Text style={titleMatchesLocation ? styles.title : styles.locationLinkText}>{locationLabel}</Text>
              </Pressable>
            ) : null}
            {!hideBodyDuplicate ? <Text style={styles.body}>{detailText}</Text> : null}

            <View style={styles.detailActions}>
              <Pressable
                onPress={() => void onToggleLike()}
                disabled={likeSubmitting}
                style={({ pressed }) => [styles.iconAction, pressed && styles.likeRowPressed, likeSubmitting && styles.likeDisabled]}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={scale(22)}
                  color={liked ? colors.profileAccent : colors.textMuted}
                />
                <Text style={styles.iconActionCount}>{likesCountLive}</Text>
              </Pressable>
              <Pressable onPress={onShareDetail} style={styles.iconAction} accessibilityLabel={t('post.share')}>
                <Ionicons name="share-outline" size={scale(22)} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.commentHead}>{t('post.commentCount', { count: commentCount })}</Text>

            {comments.length > 0 ? (
              <View style={styles.commentsList}>
                {comments.map((c) => renderComment(c))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        {firebaseConfigured && user?.uid && livePost ? (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
              style={[
                styles.stickyCommentBar,
                Platform.OS === 'android' && keyboardInset > 0
                  ? { marginBottom: keyboardInset - insets.bottom }
                  : null,
              ]}
            >
              {replyTo ? (
                <View style={styles.replyIndicator}>
                  <Text style={styles.replyIndicatorText} numberOfLines={1}>
                    {t('post.replyingTo', { name: replyTo.authorName })}
                  </Text>
                  <Pressable onPress={() => { setReplyTo(null); setCommentText(''); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={scale(18)} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={replyTo ? t('post.replyPlaceholder') : t('post.commentPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, Platform.OS === 'android' ? 100 : 0);
                  }}
                />
                <Pressable
                  onPress={() => void sendComment()}
                  disabled={commentSubmitting}
                  style={styles.sendBtn}
                >
                  {commentSubmitting ? (
                    <Text style={styles.sendingHint}>…</Text>
                  ) : (
                    <Ionicons name="send-outline" size={scale(22)} color={colors.accentPurple} />
                  )}
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        ) : null}
      </KeyboardAvoidingView>
      )}
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacingVertical.xxl },
  hero: { width: '100%', backgroundColor: colors.surfaceElevated },
  textHero: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  block: { paddingHorizontal: spacing.lg, paddingTop: spacingVertical.lg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacingVertical.sm,
  },
  authorHint: {
    ...typography.meta,
    color: colors.accentPurple,
    fontWeight: '600',
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(24),
    marginBottom: spacingVertical.lg,
    paddingTop: spacingVertical.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bookRatingRow: { marginBottom: spacingVertical.sm },
  unratedText: { ...typography.meta, color: colors.textMuted },
  iconAction: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  iconActionCount: { ...typography.meta, color: colors.textMuted, fontSize: scale(14) },
  title: {
    ...typography.detailTitle,
    color: colors.accentPurple,
    marginBottom: spacingVertical.sm,
  },
  tagline: {
    ...typography.subtitle,
    color: colors.accentLavender,
    marginBottom: spacingVertical.md,
  },
  coordsText: {
    ...typography.meta,
    color: colors.textSecondary,
    marginBottom: spacingVertical.sm,
  },
  locationLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacingVertical.sm,
    alignSelf: 'flex-start',
  },
  locationLinkPressed: { opacity: 0.85 },
  locationLinkText: {
    ...typography.subtitle,
    color: colors.accentPurple,
    fontWeight: '600',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacingVertical.md,
    lineHeight: roundLayout(typography.body.lineHeight * 1.15),
  },
  commentHead: {
    ...typography.subtitle,
    color: colors.textMuted,
    marginBottom: spacingVertical.sm,
  },
  likeRowPressed: { opacity: 0.85 },
  likeDisabled: { opacity: 0.5 },
  stickyCommentBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacingVertical.sm,
    paddingBottom: spacingVertical.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  commentBox: { marginBottom: spacingVertical.lg },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacingVertical.xs,
    marginBottom: spacingVertical.xs,
  },
  replyIndicatorText: { ...typography.meta, color: colors.accentPurple, flex: 1 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  commentInput: {
    flex: 1,
    ...typography.body,
    lineHeight: roundLayout(typography.body.lineHeight * 1.1),
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: 10,
    maxHeight: verticalScale(100),
  },
  sendBtn: { padding: spacing.sm },
  sendingHint: { ...typography.body, color: colors.textMuted, width: scale(24), textAlign: 'center' },
  commentsList: { marginBottom: spacingVertical.xl },
  commentThreadRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: spacingVertical.sm },
  commentReplyIndent: { marginLeft: scale(32) },
  commentAvatarCol: { width: scale(44), alignItems: 'center', alignSelf: 'stretch' },
  commentAvatarImg: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.surfaceElevated,
  },
  commentAvatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { fontSize: scale(14), fontWeight: '700', color: colors.accentPurple },
  commentThreadLine: {
    width: 2,
    flexGrow: 1,
    minHeight: spacingVertical.sm,
    backgroundColor: colors.threadLine,
    marginTop: spacingVertical.xxs,
    borderRadius: 1,
  },
  commentContentCol: { flex: 1, minWidth: 0, paddingLeft: spacing.sm },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacingVertical.xxs,
  },
  commentAuthor: { ...typography.meta, color: colors.textPrimary, fontWeight: '700', flex: 1 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  replyBtn: { ...typography.meta, color: colors.accentPurple, fontWeight: '600' },
  commentBody: { ...typography.body, color: colors.textSecondary },
});
