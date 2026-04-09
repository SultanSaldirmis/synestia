import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NO_SEARCH_IMAGE } from '../constants/searchPlaceholder';
import type { AttachedContent } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import {
  COLLECTION_TYPE_LABEL,
  createUserCollection,
  saveContentToUserCollection,
  subscribeUserCollections,
  type CollectionSavedItemPayload,
  type CollectionThemeType,
  type UserCollectionDoc,
} from '../services/firestoreService';
import { defaultHandleFromName } from '../utils/formatRelativeTime';
import { profileImageDisplayUri } from '../utils/profileImage';
import { colors, radii, roundLayout, scale, spacing, spacingVertical, typography, verticalScale } from '../theme';
import { CachedImage } from './CachedImage';
import { StarRating } from './StarRating';

export type PostCategory = 'music' | 'movie' | 'book' | 'text';

export type PostCardProps = {
  title: string;
  imageUrl: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatarStored?: string;
  category?: PostCategory;
  excerpt?: string;
  timeLabel?: string;
  timeDetailLabel?: string;
  showThreadLine?: boolean;
  onPress?: () => void;
  onAvatarPress?: () => void;
  contentId?: string;
  liked?: boolean;
  onToggleLike?: () => void;
  likesCount?: number;
  commentCount?: number;
  onPressComment?: () => void;
  onOpenAttachedContent?: () => void;
  onShare?: () => void;
  showOwnerDelete?: boolean;
  onDeletePost?: () => void;
  onEditPost?: () => void;
  onReportPost?: () => void;
  commentDraft?: string;
  onChangeCommentDraft?: (t: string) => void;
  onSubmitComment?: () => void;
  /** Gövde metninin altında tıklanabilir içerik kartı */
  attachedContent?: AttachedContent | null;
  /** Giriş yapılmışsa koleksiyona kaydet */
  enableBookmark?: boolean;
  bookmarkPayload?: CollectionSavedItemPayload | null;
  averageRating?: number;
  totalRatings?: number;
  postRating?: number;
};

const categoryLabel: Record<PostCategory, string> = {
  music: 'Müzik',
  movie: 'Film',
  book: 'Kitap',
  text: 'Gönderi',
};

const attachedTypeLabel: Record<AttachedContent['type'], string> = {
  song: 'Müzik',
  movie: 'Film',
  book: 'Kitap',
};

const NEW_COLL_TYPES: CollectionThemeType[] = ['film', 'music', 'book', 'mixed'];

const AVATAR = scale(44);
const MEDIA_H = verticalScale(160);
const iconMuted = colors.textMuted;

export function PostCard({
  title,
  imageUrl,
  authorName,
  authorHandle,
  authorAvatarStored,
  category,
  excerpt,
  timeLabel,
  timeDetailLabel,
  showThreadLine = false,
  onPress,
  onAvatarPress,
  contentId,
  liked,
  onToggleLike,
  likesCount = 0,
  commentCount = 0,
  onPressComment,
  onOpenAttachedContent,
  onShare,
  showOwnerDelete,
  onDeletePost,
  onEditPost,
  onReportPost,
  commentDraft,
  onChangeCommentDraft,
  onSubmitComment,
  attachedContent,
  enableBookmark = false,
  bookmarkPayload = null,
  averageRating,
  totalRatings,
  postRating,
}: PostCardProps) {
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveView, setSaveView] = useState<'pick' | 'new'>('pick');
  const [collections, setCollections] = useState<UserCollectionDoc[]>([]);
  const [newCollName, setNewCollName] = useState('');
  const [newCollType, setNewCollType] = useState<CollectionThemeType>('mixed');
  const [saveBusy, setSaveBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const showLike = Boolean(contentId && onToggleLike);
  const hasAttached = Boolean(attachedContent?.title?.trim());
  const showBookmark = Boolean(enableBookmark && bookmarkPayload && contentId && user?.uid);

  useEffect(() => {
    if (!saveOpen || !user?.uid) {
      setCollections([]);
      return;
    }
    return subscribeUserCollections(user.uid, setCollections);
  }, [saveOpen, user?.uid]);

  const closeSaveModal = () => {
    setSaveOpen(false);
    setSaveView('pick');
    setNewCollName('');
    setNewCollType('mixed');
  };

  const onPickCollection = async (collId: string) => {
    if (!user?.uid || !bookmarkPayload) return;
    setSaveBusy(true);
    try {
      await saveContentToUserCollection(user.uid, collId, bookmarkPayload);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Başarıyla eklendi', ToastAndroid.SHORT);
      } else {
        Alert.alert('Kaydedildi', 'İçerik koleksiyona eklendi.');
      }
      closeSaveModal();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaveBusy(false);
    }
  };

  const onCreateAndSave = async () => {
    if (!user?.uid || !bookmarkPayload) return;
    const n = newCollName.trim();
    if (!n) {
      Alert.alert('İsim', 'Koleksiyon adı girin.');
      return;
    }
    setSaveBusy(true);
    try {
      const id = await createUserCollection(user.uid, n, newCollType);
      await saveContentToUserCollection(user.uid, id, bookmarkPayload);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Başarıyla eklendi', ToastAndroid.SHORT);
      } else {
        Alert.alert('Kaydedildi', 'Yeni koleksiyon oluşturuldu ve içerik eklendi.');
      }
      closeSaveModal();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Oluşturulamadı.');
    } finally {
      setSaveBusy(false);
    }
  };
  const isTextPost = !hasAttached && (category === 'text' || !imageUrl?.trim());
  const showCommentBox = Boolean(onSubmitComment && onChangeCommentDraft !== undefined && commentDraft !== undefined);
  const avatarUri = profileImageDisplayUri(authorAvatarStored);
  const displayName = (authorName ?? 'Kullanıcı').replace(/^@/, '').trim() || 'Kullanıcı';
  const handle = authorHandle ?? defaultHandleFromName(authorName);
  const bodyText = excerpt?.trim() || title;
  const effectiveRating = typeof postRating === 'number' ? postRating : averageRating;

  const openComments = onPressComment ?? onPress;
  const hasMenu = showOwnerDelete || onReportPost;

  const mainBlock = (
    <>
      <View style={styles.headerRow}>
        <Pressable onPress={onAvatarPress ?? onPress} disabled={!onAvatarPress && !onPress} style={styles.nameBlock}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            {handle}
          </Text>
        </Pressable>
        <View style={styles.headerRight}>
          {timeLabel ? (
            <View style={styles.timeCol}>
              <Text style={styles.time} numberOfLines={1}>
                {timeLabel}
              </Text>
              {timeDetailLabel ? (
                <Text style={styles.timeDetail} numberOfLines={1}>
                  {timeDetailLabel}
                </Text>
              ) : null}
            </View>
          ) : null}
          {hasMenu ? (
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={styles.dotsHit} accessibilityLabel="Seçenekler">
              <Ionicons name="ellipsis-vertical" size={scale(18)} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {category ? (
        <View style={styles.inlineBadge}>
          <Text style={styles.inlineBadgeText}>{categoryLabel[category]}</Text>
        </View>
      ) : null}
      {category === 'book' || category === 'movie' || attachedContent?.type === 'book' || attachedContent?.type === 'movie' ? (
        <View style={styles.ratingRow}>
          {typeof effectiveRating === 'number' ? (
            <StarRating rating={effectiveRating} totalRatings={totalRatings} size={scale(13)} />
          ) : (
            <Text style={styles.unratedText}>Henüz puanlanmadı</Text>
          )}
        </View>
      ) : null}

      {!hasAttached && !isTextPost && imageUrl?.trim() ? (
        <Pressable onPress={onPress} disabled={!onPress} style={styles.mediaWrap}>
          {!imageError ? (
            <CachedImage
              uri={imageUrl}
              style={styles.media}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.mediaPlaceholder}>
              <Ionicons name="image-outline" size={scale(32)} color={colors.textMuted} />
            </View>
          )}
        </Pressable>
      ) : isTextPost ? (
        <View style={styles.textPostIconRow}>
          <Ionicons name="document-text-outline" size={scale(22)} color={colors.accentPurpleMuted} />
        </View>
      ) : null}

      <Pressable onPress={openComments} disabled={!openComments}>
        <Text style={styles.bodyText}>{bodyText}</Text>
      </Pressable>

      {hasAttached && attachedContent ? (
        <Pressable
          onPress={
            attachedContent.type === 'song'
              ? onPress
              : attachedContent.type === 'book' || attachedContent.type === 'movie'
                ? onOpenAttachedContent
                : undefined
          }
          disabled={
            attachedContent.type === 'song'
              ? !onPress
              : attachedContent.type === 'book' || attachedContent.type === 'movie'
                ? !onOpenAttachedContent
                : true
          }
          style={({ pressed }) => [styles.attachedCard, pressed && styles.attachedCardPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Bağlı içerik: ${attachedContent.title}`}
        >
          {attachedContent.imageUrl?.trim() ? (
            <CachedImage uri={attachedContent.imageUrl} style={styles.attachedThumb} />
          ) : (
            <CachedImage localSource={NO_SEARCH_IMAGE} style={styles.attachedThumb} />
          )}
          <View style={styles.attachedTextCol}>
            <Text style={styles.attachedType}>{attachedTypeLabel[attachedContent.type]}</Text>
            <Text style={styles.attachedTitle} numberOfLines={2}>
              {attachedContent.title}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => openComments?.()}
          disabled={!openComments}
          hitSlop={8}
          style={styles.actionHit}
          accessibilityLabel="Yorumlar"
        >
          <Ionicons name="chatbubble-outline" size={scale(20)} color={iconMuted} />
          <Text style={styles.actionCount}>{commentCount}</Text>
        </Pressable>
        {showLike ? (
          <Pressable onPress={onToggleLike} hitSlop={8} style={styles.actionHit} accessibilityLabel={liked ? 'Beğeniyi kaldır' : 'Beğen'}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={scale(20)} color={liked ? colors.profileAccent : iconMuted} />
            <Text style={styles.actionCount}>{likesCount}</Text>
          </Pressable>
        ) : (
          <View style={styles.actionHit}>
            <Ionicons name="heart-outline" size={scale(20)} color={iconMuted} />
            <Text style={styles.actionCount}>{likesCount}</Text>
          </View>
        )}
        {onShare ? (
          <Pressable onPress={onShare} hitSlop={8} style={styles.actionHit} accessibilityLabel="Paylaş">
            <Ionicons name="share-outline" size={scale(20)} color={iconMuted} />
          </Pressable>
        ) : null}
        {showBookmark ? (
          <Pressable
            onPress={() => setSaveOpen(true)}
            hitSlop={8}
            style={styles.actionHit}
            accessibilityLabel="Koleksiyona kaydet"
          >
            <Ionicons name="bookmark-outline" size={scale(20)} color={iconMuted} />
          </Pressable>
        ) : null}
      </View>

      {showCommentBox ? (
        <View style={styles.commentRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Yorum yaz…"
            placeholderTextColor={colors.textMuted}
            value={commentDraft}
            onChangeText={onChangeCommentDraft}
            multiline
          />
          <Pressable
            onPress={() => {
              if (!onSubmitComment || commentBusy) return;
              setCommentBusy(true);
              Promise.resolve(onSubmitComment()).finally(() => setCommentBusy(false));
            }}
            style={styles.commentSend}
            hitSlop={8}
            disabled={commentBusy}
          >
            <Ionicons name={commentBusy ? 'time-outline' : 'send-outline'} size={scale(20)} color={colors.accentPurple} />
          </Pressable>
        </View>
      ) : null}

      {/* 3-dot options modal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
        <View style={styles.menuSheet}>
          {showOwnerDelete && onEditPost ? (
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onEditPost();
              }}
            >
              <Ionicons name="create-outline" size={scale(20)} color={colors.accentPurple} />
              <Text style={styles.menuItemText}>Düzenle</Text>
            </Pressable>
          ) : null}
          {showOwnerDelete && onDeletePost ? (
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onDeletePost();
              }}
            >
              <Ionicons name="trash-outline" size={scale(20)} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Sil</Text>
            </Pressable>
          ) : null}
          {!showOwnerDelete && onReportPost ? (
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onReportPost();
              }}
            >
              <Ionicons name="flag-outline" size={scale(20)} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Raporla</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.menuCancel} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuCancelText}>İptal</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={saveOpen} transparent animationType="slide" onRequestClose={closeSaveModal}>
        <Pressable style={styles.menuBackdrop} onPress={closeSaveModal} />
        <View style={styles.saveSheet}>
          <Text style={styles.saveTitle}>Koleksiyona kaydet</Text>
          {saveView === 'pick' ? (
            <>
              <ScrollView style={styles.saveScroll} keyboardShouldPersistTaps="handled">
                <Pressable
                  style={styles.saveNewRow}
                  onPress={() => setSaveView('new')}
                  disabled={saveBusy}
                >
                  <Ionicons name="add-circle-outline" size={scale(22)} color={colors.accentPurple} />
                  <Text style={styles.saveNewText}>Yeni koleksiyon oluştur</Text>
                </Pressable>
                {collections.length === 0 ? (
                  <Text style={styles.saveEmpty}>Henüz koleksiyon yok. Yukarıdan oluşturun.</Text>
                ) : (
                  collections.map((c) => (
                    <Pressable
                      key={c.id}
                      style={({ pressed }) => [styles.saveRow, pressed && styles.rowPressed]}
                      onPress={() => void onPickCollection(c.id)}
                      disabled={saveBusy}
                    >
                      <Ionicons name="folder-open-outline" size={scale(20)} color={colors.accentPurple} />
                      <View style={styles.saveRowText}>
                        <Text style={styles.saveRowTitle} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.saveRowMeta} numberOfLines={1}>
                          {COLLECTION_TYPE_LABEL[c.type]} · {c.itemsCount} öğe
                        </Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <TextInput
                style={styles.saveInput}
                placeholder="Koleksiyon adı"
                placeholderTextColor={colors.textMuted}
                value={newCollName}
                onChangeText={setNewCollName}
              />
              <View style={styles.typeChips}>
                {NEW_COLL_TYPES.map((t) => {
                  const active = newCollType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setNewCollType(t)}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {COLLECTION_TYPE_LABEL[t]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                style={styles.savePrimary}
                onPress={() => void onCreateAndSave()}
                disabled={saveBusy}
              >
                {saveBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.savePrimaryText}>Oluştur ve kaydet</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setSaveView('pick')} style={styles.menuCancel} disabled={saveBusy}>
                <Text style={styles.menuCancelText}>Geri</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={closeSaveModal} style={styles.menuCancel} disabled={saveBusy}>
            <Text style={styles.menuCancelText}>Kapat</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatarColumn}>
          <Pressable
            onPress={onAvatarPress}
            disabled={!onAvatarPress}
            style={({ pressed }) => [styles.avatarPressable, pressed && onAvatarPress && styles.avatarPressed]}
          >
            {avatarUri ? (
              <CachedImage uri={avatarUri} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </Pressable>
          {showThreadLine ? <View style={styles.threadLine} /> : null}
        </View>
        <View style={styles.contentCol}>
          <View style={styles.contentInner}>{mainBlock}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacingVertical.sm,
    paddingVertical: spacingVertical.md,
    paddingRight: spacing.md,
    paddingLeft: spacingVertical.xs,
  } satisfies ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  avatarColumn: {
    width: scale(52),
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  avatarPressable: {
    borderRadius: AVATAR / 2,
  },
  avatarPressed: { opacity: 0.88 },
  avatarImg: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.surfaceElevated,
  },
  avatarFallback: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: scale(18),
    fontWeight: '700',
    color: colors.accentPurple,
  },
  threadLine: {
    width: 2,
    flexGrow: 1,
    minHeight: spacingVertical.md,
    backgroundColor: colors.threadLine,
    marginTop: spacingVertical.xs,
    borderRadius: 1,
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
  },
  contentInner: {
    paddingLeft: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacingVertical.xs,
  },
  nameBlock: { flex: 1, minWidth: 0 },
  displayName: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  handle: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  timeCol: { alignItems: 'flex-end' },
  dotsHit: { padding: spacing.xxs },
  time: {
    ...typography.meta,
    color: colors.textMuted,
    fontSize: scale(11),
  },
  timeDetail: {
    ...typography.meta,
    color: colors.textMuted,
    fontSize: scale(10),
    marginTop: 1,
  },
  inlineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacingVertical.xxs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacingVertical.sm,
  },
  inlineBadgeText: {
    ...typography.caption,
    color: colors.accentLavender,
  },
  ratingRow: { marginBottom: spacingVertical.xs },
  unratedText: { ...typography.meta, color: colors.textMuted },
  mediaWrap: {
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginBottom: spacingVertical.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  media: {
    width: '100%',
    height: MEDIA_H,
    backgroundColor: colors.surfaceElevated,
  },
  mediaPlaceholder: {
    width: '100%',
    height: MEDIA_H,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textPostIconRow: {
    marginBottom: spacingVertical.xs,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacingVertical.sm,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacingVertical.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacingVertical.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  attachedCardPressed: { opacity: 0.88 },
  attachedThumb: {
    width: scale(52),
    height: scale(52),
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  attachedTextCol: { flex: 1, minWidth: 0 },
  attachedType: {
    ...typography.caption,
    color: colors.accentPurple,
    fontWeight: '600',
    marginBottom: 2,
  },
  attachedTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(20),
    marginTop: spacingVertical.xs,
    paddingTop: spacingVertical.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  actionCount: {
    ...typography.meta,
    color: colors.textMuted,
    fontSize: scale(13),
    minWidth: scale(16),
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacingVertical.sm,
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    ...typography.body,
    lineHeight: roundLayout(typography.body.lineHeight * 1.1),
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacingVertical.xs,
    paddingBottom: 10,
    maxHeight: verticalScale(80),
  },
  commentSend: {
    padding: spacing.xs,
  },
  /* 3-dot menu styles */
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuSheet: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacingVertical.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  menuCancel: {
    paddingVertical: spacingVertical.md,
    alignItems: 'center',
  },
  menuCancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  saveSheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xxl,
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  saveTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacingVertical.md,
    fontSize: scale(18),
  },
  saveScroll: { maxHeight: verticalScale(320) },
  saveNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacingVertical.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  saveNewText: { ...typography.body, color: colors.accentPurple, fontWeight: '600' },
  saveEmpty: { ...typography.meta, color: colors.textMuted, paddingVertical: spacingVertical.lg },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacingVertical.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  saveRowText: { flex: 1, minWidth: 0 },
  saveRowTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '600' },
  saveRowMeta: { ...typography.meta, color: colors.textMuted, marginTop: 2 },
  saveInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacingVertical.md,
  },
  typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacingVertical.md },
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
  savePrimary: {
    backgroundColor: colors.profileAccent,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.sm,
    alignItems: 'center',
    marginBottom: spacingVertical.sm,
  },
  savePrimaryText: { ...typography.button, color: '#ffffff', fontWeight: '700' },
  rowPressed: { opacity: 0.88 },
});
