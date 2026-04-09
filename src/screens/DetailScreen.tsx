import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
import { colors, radii, roundLayout, scale, spacing, spacingVertical, typography, verticalScale } from '../theme';

type DetailRoute = RouteProp<RootStackParamList, 'Detail'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;


export function DetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
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
  const [liked, setLiked] = useState(false);
  const [livePost, setLivePost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostCommentDoc[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentSubmittingRef = useRef(false);
  const [replyTo, setReplyTo] = useState<PostCommentDoc | null>(null);
  const [catalogRating, setCatalogRating] = useState<{ averageRating: number; totalRatings: number } | null>(null);

  const { width: windowWidth } = Dimensions.get('window');
  const heroHeight = roundLayout(Math.min(verticalScale(240), windowWidth * 0.58));

  const detailText =
    body ?? description ?? 'Bu içerik için henüz açıklama eklenmedi.';
  const normalizedDescription = description?.trim() ?? '';
  const normalizedBody = detailText.trim();
  const showTagline = Boolean(normalizedDescription && normalizedDescription !== normalizedBody);

  const actorName = user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';

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
    if (!isFirebaseConfigured()) return;
    return subscribePostById(id, setLivePost);
  }, [id]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return subscribePostComments(id, setComments);
  }, [id]);

  const commentCount = livePost?.commentCount ?? routeCommentCount ?? 0;
  const likesCountLive = livePost?.likesCount ?? 0;
  const postAuthorUid = livePost?.authorUid ?? authorUid;
  const isText = category === 'text' || !imageUrl?.trim();
  const canDeletePost =
    Boolean(firebaseConfigured && user?.uid && postAuthorUid && user.uid === postAuthorUid);
  const catalogRef =
    category === 'book'
      ? {
          kind: 'book' as const,
          id: livePost?.attachedContent?.type === 'book' ? livePost.attachedContent.id : id,
        }
      : category === 'movie'
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
    if (!user?.uid) {
      Alert.alert('Oturum', 'Beğenmek için giriş yapın.');
      return;
    }
    try {
      const next = await togglePostLike(user.uid, actorName, {
        id,
        title,
        imageUrl: imageUrl ?? '',
        category,
        authorName: routeAuthorName ?? description,
        authorUid: postAuthorUid,
        excerpt: description ?? body,
      });
      setLiked(next);
    } catch {
      Alert.alert('Hata', 'Beğeni kaydedilemedi.');
    }
  }, [actorName, body, category, description, id, imageUrl, postAuthorUid, routeAuthorName, title, user?.uid]);

  const sendComment = useCallback(async () => {
    if (commentSubmittingRef.current) return;
    if (!user?.uid) {
      Alert.alert('Oturum', 'Yorum için giriş yapın.');
      return;
    }
    const t = commentText.trim();
    if (!t) return;
    commentSubmittingRef.current = true;
    setCommentSubmitting(true);
    try {
      const profile = await getUserProfileOnce(user.uid);
      await addPostComment(
        id,
        user.uid,
        actorName,
        t,
        postAuthorUid,
        title,
        profile?.profileImageUrl,
        replyTo?.id,
      );
      setCommentText('');
      setReplyTo(null);
    } catch {
      Alert.alert('Hata', 'Yorum gönderilemedi.');
    } finally {
      commentSubmittingRef.current = false;
      setCommentSubmitting(false);
    }
  }, [actorName, commentText, id, postAuthorUid, replyTo, title, user?.uid]);

  const onShareDetail = useCallback(() => {
    void Share.share({
      message: `${title}\n\n${detailText}`.trim().slice(0, 2000),
    });
  }, [detailText, title]);

  const onDeletePost = useCallback(() => {
    if (!user?.uid || !canDeletePost) return;
    Alert.alert('Gönderiyi sil', 'Bu işlem geri alınamaz.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deletePost(id, user.uid);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi.');
            }
          })();
        },
      },
    ]);
  }, [canDeletePost, id, navigation, user?.uid]);

  const onDeleteComment = useCallback(
    (c: PostCommentDoc) => {
      if (!user?.uid || c.authorUid !== user.uid) return;
      Alert.alert('Yorumu sil', 'Bu yorum kaldırılacak.', [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deletePostComment(id, c.id, user.uid);
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi.');
              }
            })();
          },
        },
      ]);
    },
    [id, user?.uid],
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
    const avatarUri = profileImageDisplayUri(c.authorProfileImageUrl);
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
                    <Text style={styles.replyBtn}>Yanıtla</Text>
                  </Pressable>
                ) : null}
                {user?.uid === c.authorUid ? (
                  <Pressable onPress={() => onDeleteComment(c)} hitSlop={8} accessibilityLabel="Yorumu sil">
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
      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? scale(56) : 0}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isText && imageUrl ? (
          <CachedImage
            uri={imageUrl}
            style={[styles.hero, { height: heroHeight }]}
          />
        ) : isText ? (
          <View style={[styles.textHero, { height: heroHeight }]}>
            <Ionicons name="document-text-outline" size={scale(56)} color={colors.accentPurple} />
          </View>
        ) : null}

        <View style={styles.block}>
          <View style={styles.titleRow}>
            {routeAuthorName ? (
              <Pressable onPress={() => postAuthorUid && navigateToProfile(postAuthorUid)} style={{ flex: 1 }}>
                <Text style={styles.authorHint} numberOfLines={1}>
                  {routeAuthorName}
                </Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {canDeletePost ? (
              <Pressable onPress={onDeletePost} hitSlop={10} accessibilityLabel="Gönderiyi sil">
                <Ionicons name="trash-outline" size={scale(22)} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.title}>{title}</Text>
          {catalogRef ? (
            <View style={styles.bookRatingRow}>
              {typeof catalogRating?.averageRating === 'number' ? (
                <StarRating
                  rating={catalogRating.averageRating}
                  totalRatings={catalogRating.totalRatings ?? 0}
                />
              ) : (
                <Text style={styles.unratedText}>Henüz puanlanmadı</Text>
              )}
            </View>
          ) : null}
          {showTagline ? <Text style={styles.tagline}>{description}</Text> : null}
          <Text style={styles.body}>{detailText}</Text>

          <View style={styles.detailActions}>
            <Pressable
              onPress={() => void onToggleLike()}
              style={({ pressed }) => [styles.iconAction, pressed && styles.likeRowPressed]}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={scale(22)}
                color={liked ? colors.profileAccent : colors.textMuted}
              />
              <Text style={styles.iconActionCount}>{likesCountLive}</Text>
            </Pressable>
            <Pressable onPress={onShareDetail} style={styles.iconAction} accessibilityLabel="Paylaş">
              <Ionicons name="share-outline" size={scale(22)} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.commentHead}>{commentCount} Yorum</Text>

          {firebaseConfigured && user?.uid ? (
            <View style={styles.commentBox}>
              {replyTo ? (
                <View style={styles.replyIndicator}>
                  <Text style={styles.replyIndicatorText} numberOfLines={1}>
                    {replyTo.authorName} adlı kullanıcıya yanıt
                  </Text>
                  <Pressable onPress={() => { setReplyTo(null); setCommentText(''); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={scale(18)} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={replyTo ? 'Yanıtınızı yazın…' : 'Yorumunuzu yazın…'}
                  placeholderTextColor={colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
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
          ) : null}

          {comments.length > 0 ? (
            <View style={styles.commentsList}>
              {comments.map((c) => renderComment(c))}
            </View>
          ) : null}

        </View>
      </ScrollView>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
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
