import {
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  documentId,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAt,
  endAt,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore';

import type { PostCategory } from '../components';
import type { AttachedContent, FeedPost } from '../data/mockData';
import { sanitizeData } from '../utils/firebaseUtils';
import { getFirebaseApp } from './firebaseApp';

const PLACEHOLDER_IMAGE =
  'https://picsum.photos/seed/synestia-text/800/400';

export type UserProfileDoc = {
  displayName?: string;
  email?: string;
  bio?: string;
  profileImageUrl?: string;
  followersCount?: number;
  followingCount?: number;
  collectionsCount?: number;
  isPrivate?: boolean;
};

export type UserLikeDoc = {
  contentId: string;
  title: string;
  imageUrl: string;
  category: PostCategory;
  subtitle: string;
};

/** Koleksiyon teması (Firestore `type` alanı). */
export type CollectionThemeType = 'film' | 'music' | 'book' | 'mixed';

export const COLLECTION_TYPE_LABEL: Record<CollectionThemeType, string> = {
  film: 'Film',
  music: 'Müzik',
  book: 'Kitap',
  mixed: 'Karışık',
};

export type UserCollectionDoc = {
  id: string;
  name: string;
  type: CollectionThemeType;
  itemsCount: number;
};

/** Kayıtlı içerik satırı (Firestore `items` dizisi öğesi). */
export type CollectionSavedItemPayload = {
  postId?: string;
  contentType: 'movie' | 'music' | 'book' | 'moment';
  title: string;
  imageUrl: string;
  externalUrl?: string;
};

export type NotificationDoc = {
  id: string;
  type: 'follow_request' | 'new_follower' | 'like' | 'comment';
  fromUid: string;
  fromDisplayName: string;
  postId?: string;
  postTitle?: string;
  read?: boolean;
};

export type UserSearchRow = {
  uid: string;
  displayName: string;
  profileImageUrl?: string;
  isPrivate?: boolean;
};

export type FollowListRow = {
  uid: string;
  label: string;
  profileImageUrl?: string;
};

export type CollectionItemDoc = {
  id: string;
  title: string;
  imageUrl?: string;
  contentType?: 'movie' | 'music' | 'book' | 'moment';
  externalUrl?: string;
  postId?: string;
  savedAtMs?: number;
};

export type PostCommentDoc = {
  id: string;
  authorUid: string;
  authorName: string;
  authorProfileImageUrl?: string;
  text: string;
  parentId?: string;
  createdAtMs?: number;
  contentType?: 'book' | 'movie' | 'music';
  contentId?: string;
  contentTitle?: string;
};

export type GlobalContentCommentDoc = {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorProfileImageUrl?: string;
  text: string;
  createdAtMs?: number;
  rating?: number;
  kind?: 'post' | 'comment';
  contentImageUrl?: string;
};

export type BookRatingSummary = {
  bookId: string;
  averageRating: number;
  totalRatings: number;
};
export type CatalogRatingKind = 'book' | 'movie';
export type CatalogRatingRef = { kind: CatalogRatingKind; id: string };

function isPostCategory(c: unknown): c is PostCategory {
  return c === 'music' || c === 'movie' || c === 'book' || c === 'text' || c === 'moment';
}

function mapCollectionThemeType(raw: unknown): CollectionThemeType {
  if (raw === 'film' || raw === 'music' || raw === 'book' || raw === 'mixed') return raw;
  return 'mixed';
}

function mapCollectionItemFromStored(raw: unknown): CollectionItemDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const ct = o.contentType;
  const contentType =
    ct === 'movie' || ct === 'music' || ct === 'book' || ct === 'moment' ? ct : undefined;
  const iu = o.imageUrl;
  return {
    id: String(o.entryId ?? `legacy_${Math.random().toString(36).slice(2)}`),
    title: String(o.title ?? ''),
    imageUrl: typeof iu === 'string' && iu.trim() ? iu : undefined,
    contentType,
    externalUrl: typeof o.externalUrl === 'string' && o.externalUrl.trim() ? o.externalUrl : undefined,
    postId: typeof o.postId === 'string' ? o.postId : undefined,
    savedAtMs: typeof o.savedAtMs === 'number' ? o.savedAtMs : undefined,
  };
}

function mapAttachedContent(raw: unknown): AttachedContent | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const t = o.type;
  if (t !== 'song' && t !== 'movie' && t !== 'book') return undefined;
  return {
    type: t,
    id: String(o.id ?? ''),
    title: String(o.title ?? ''),
    artistName: typeof o.artistName === 'string' ? o.artistName : undefined,
    imageUrl: String(o.imageUrl ?? ''),
    externalUrl: String(o.externalUrl ?? ''),
    previewUrl: typeof o.previewUrl === 'string' ? o.previewUrl : undefined,
  };
}

function mapPost(id: string, data: Record<string, unknown>): FeedPost | null {
  const cat = data.category;
  if (!isPostCategory(cat)) return null;
  const cc = data.commentCount;
  const lc = data.likesCount;
  const ap = data.authorProfileImageUrl;
  const atMs = createdAtMillis(data);
  const clientMs = typeof data.createdAtClientMs === 'number' ? data.createdAtClientMs : undefined;
  const attached = mapAttachedContent(data.attachedContent);
  return {
    id,
    title: String(data.title ?? ''),
    imageUrl: String(data.imageUrl ?? ''),
    authorName: String(data.authorName ?? ''),
    authorUid: data.authorUid ? String(data.authorUid) : undefined,
    authorIsPrivate: data.authorIsPrivate === true,
    category: cat,
    excerpt: String(data.excerpt ?? data.body ?? ''),
    commentCount: typeof cc === 'number' ? cc : 0,
    likesCount: typeof lc === 'number' ? lc : 0,
    rating: typeof data.rating === 'number' ? data.rating : undefined,
    authorProfileImageUrl: typeof ap === 'string' && ap.trim() ? ap : undefined,
    createdAtMs: atMs > 0 ? atMs : undefined,
    createdAtClientMs: clientMs && clientMs > 0 ? clientMs : undefined,
    attachedContent: attached,
  };
}

function createdAtMillis(data: Record<string, unknown>): number {
  const c = data.createdAt;
  if (c && typeof c === 'object' && 'toMillis' in c && typeof (c as Timestamp).toMillis === 'function') {
    return (c as Timestamp).toMillis();
  }
  return 0;
}

async function deleteAllDocsInCollection(db: Firestore, segments: [string, ...string[]]): Promise<void> {
  const colRef = collection(db, ...segments);
  for (;;) {
    const snap = await getDocs(query(colRef, limit(400)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/** Tüm gönderiler (filtre yok). */
export function subscribeFeedPosts(onNext: (posts: FeedPost[]) => void): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext([]);
    return () => {};
  }
  const db = getFirestore(app);
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const out: FeedPost[] = [];
      snap.forEach((d) => {
        const row = mapPost(d.id, d.data() as Record<string, unknown>);
        if (row) out.push(row);
      });
      onNext(out);
    },
    () => onNext([]),
  );
}

export function subscribeFollowingIds(uid: string, onNext: (ids: Set<string>) => void): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext(new Set());
    return () => {};
  }
  const db = getFirestore(app);
  return onSnapshot(
    collection(db, 'users', uid, 'following'),
    (snap) => {
      const s = new Set<string>();
      snap.forEach((d) => s.add(d.id));
      onNext(s);
    },
    () => onNext(new Set()),
  );
}

/** Global akış: açık profiller + takip edilen gizli profiller. */
export function subscribeFeedPostsForHome(
  viewerUid: string | null,
  onNext: (posts: FeedPost[]) => void,
): () => void {
  let allPosts: FeedPost[] = [];
  let following = new Set<string>();
  let unsubP: (() => void) | null = null;
  let unsubF: (() => void) | null = null;

  const emit = () => {
    const filtered = allPosts.filter((p) => {
      const aid = p.authorUid;
      if (!aid) return true;
      if (!p.authorIsPrivate) return true;
      if (viewerUid && aid === viewerUid) return true;
      if (viewerUid && following.has(aid)) return true;
      return false;
    });
    onNext(filtered);
  };

  unsubP = subscribeFeedPosts((list) => {
    allPosts = list;
    emit();
  });

  if (viewerUid) {
    unsubF = subscribeFollowingIds(viewerUid, (ids) => {
      following = ids;
      emit();
    });
  }

  return () => {
    unsubP?.();
    unsubF?.();
  };
}

export async function getUserProfileOnce(uid: string): Promise<UserProfileDoc | null> {
  const app = getFirebaseApp();
  if (!app) return null;
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfileDoc;
}

export function subscribeUserProfile(
  uid: string,
  onNext: (profile: UserProfileDoc | null) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext(null);
    return () => {};
  }
  const db = getFirestore(app);
  const refDoc = doc(db, 'users', uid);
  return onSnapshot(
    refDoc,
    (s) => {
      if (!s.exists()) {
        onNext(null);
        return;
      }
      onNext(s.data() as UserProfileDoc);
    },
    () => onNext(null),
  );
}

export async function updateUserProfileData(
  uid: string,
  data: Partial<Pick<UserProfileDoc, 'bio' | 'profileImageUrl' | 'isPrivate'>>,
): Promise<void> {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error('Firebase yapılandırılmadı.');
  }
  const db = getFirestore(app);
  const refDoc = doc(db, 'users', uid);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.bio !== undefined) payload.bio = data.bio;
  if (data.profileImageUrl !== undefined) payload.profileImageUrl = data.profileImageUrl;
  if (data.isPrivate !== undefined) payload.isPrivate = data.isPrivate;
  await updateDoc(refDoc, payload);
}

const BATCH_MAX = 450;

/**
 * Profil fotoğrafı güncellendiğinde, bu kullanıcının yazdığı tüm gönderi ve yorumlarda
 * `authorProfileImageUrl` alanını toplu günceller (WriteBatch, 450’lik parçalar).
 * Not: Şema `authorProfilePic` değil `authorProfileImageUrl` kullanır.
 */
export async function syncAuthorProfileImageEverywhere(uid: string, newProfileImageUrl: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);

  const flushBatch = async (refs: DocumentReference[]) => {
    if (refs.length === 0) return;
    const batch = writeBatch(db);
    refs.forEach((r) => batch.update(r, { authorProfileImageUrl: newProfileImageUrl }));
    await batch.commit();
  };

  let buffer: DocumentReference[] = [];

  const pushRef = async (r: DocumentReference) => {
    buffer.push(r);
    if (buffer.length >= BATCH_MAX) {
      await flushBatch(buffer);
      buffer = [];
    }
  };

  const postsSnap = await getDocs(query(collection(db, 'posts'), where('authorUid', '==', uid)));
  for (const d of postsSnap.docs) {
    await pushRef(d.ref);
  }

  let commentsSnap;
  try {
    commentsSnap = await getDocs(query(collectionGroup(db, 'comments'), where('authorUid', '==', uid)));
  } catch (e) {
    console.warn(
      '[Synestia][Firestore] collectionGroup(comments) sorgusu başarısız — firestore.indexes.json ile indeks oluşturup dağıtın.',
      e,
    );
    commentsSnap = null;
  }
  if (commentsSnap) {
    for (const d of commentsSnap.docs) {
      await pushRef(d.ref);
    }
  }

  await flushBatch(buffer);
}

async function pushNotification(
  targetUid: string,
  notifId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  const db = getFirestore(app);
  await setDoc(
    doc(db, 'users', targetUid, 'notifications', notifId),
    { ...data, read: false, createdAt: serverTimestamp() },
    { merge: true },
  );
}

function attachedToCategory(t: AttachedContent['type']): PostCategory {
  if (t === 'song') return 'music';
  return t;
}

/** Metin + isteğe bağlı bağlı içerik (kitap/film/şarkı). */
export async function createFeedPost(
  uid: string,
  profile: { displayName: string; profileImageUrl?: string; isPrivate?: boolean },
  text: string,
  attachedContent: AttachedContent | null | undefined,
  rating?: number,
): Promise<string> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const body = text.trim();
  if (!body) throw new Error('Metin boş olamaz.');
  const db = getFirestore(app);
  const ref = doc(collection(db, 'posts'));

  const hasAttached = Boolean(attachedContent?.title && attachedContent.type);
  const category: PostCategory = hasAttached && attachedContent
    ? attachedToCategory(attachedContent.type)
    : 'text';
  const titlePreview = hasAttached && attachedContent
    ? `${attachedContent.title}`.slice(0, 80)
    : body.slice(0, 80);

  const payload: Record<string, unknown> = {
    title: titlePreview,
    excerpt: body,
    imageUrl: '',
    category,
    authorName: profile.displayName,
    authorUid: uid,
    authorProfileImageUrl: profile.profileImageUrl ?? '',
    authorIsPrivate: profile.isPrivate === true,
    commentCount: 0,
    likesCount: 0,
    createdAt: serverTimestamp(),
    createdAtClientMs: Date.now(),
  };
  if (hasAttached && attachedContent) {
    payload.attachedContent = sanitizeData({
      type: attachedContent.type,
      id: attachedContent.id,
      title: attachedContent.title,
      artistName: attachedContent.artistName,
      imageUrl: attachedContent.imageUrl,
      externalUrl: attachedContent.externalUrl,
      previewUrl: attachedContent.previewUrl ?? null,
    });
  }
  if (typeof rating === 'number' && rating >= 1 && rating <= 5 && (category === 'book' || category === 'movie')) {
    payload.rating = rating;
  }

  await setDoc(ref, sanitizeData(payload as Record<string, unknown>));
  return ref.id;
}

export async function createTextPost(
  uid: string,
  profile: { displayName: string; profileImageUrl?: string; isPrivate?: boolean },
  text: string,
): Promise<string> {
  return createFeedPost(uid, profile, text, null);
}

/** Fotoğraf + konum + metin içeren anı gönderisi oluşturur. */
export async function createMomentPost(
  uid: string,
  profile: { displayName: string; profileImageUrl?: string; isPrivate?: boolean },
  text: string,
  imageUrl: string,
  location?: { latitude: number; longitude: number },
): Promise<string> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const body = text.trim();
  if (!body && !imageUrl) throw new Error('Metin veya fotoğraf gerekli.');
  const db = getFirestore(app);
  const ref = doc(collection(db, 'posts'));

  const payload: Record<string, unknown> = {
    title: body.slice(0, 80) || 'Anı',
    excerpt: body,
    imageUrl,
    category: 'moment' as PostCategory,
    authorName: profile.displayName,
    authorUid: uid,
    authorProfileImageUrl: profile.profileImageUrl ?? '',
    authorIsPrivate: profile.isPrivate === true,
    commentCount: 0,
    likesCount: 0,
    createdAt: serverTimestamp(),
    createdAtClientMs: Date.now(),
  };

  if (location) {
    payload.location = { latitude: location.latitude, longitude: location.longitude };
  }

  await setDoc(ref, sanitizeData(payload as Record<string, unknown>));
  return ref.id;
}

/**
 * Anıyı kullanıcının "Anılar" koleksiyonuna kaydeder.
 * Koleksiyon yoksa otomatik oluşturur.
 */
export async function saveMomentToCollection(
  uid: string,
  imageUrl: string,
  postId?: string,
): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  const db = getFirestore(app);

  // "Anılar" koleksiyonunu bul veya oluştur
  const collSnap = await getDocs(
    query(collection(db, 'users', uid, 'collections'), where('name', '==', 'Anılar')),
  );

  let collectionId: string;
  if (collSnap.empty) {
    collectionId = await createUserCollection(uid, 'Anılar', 'mixed');
  } else {
    collectionId = collSnap.docs[0].id;
  }

  await saveContentToUserCollection(uid, collectionId, {
    contentType: 'moment',
    title: `Anı — ${new Date().toLocaleDateString('tr-TR')}`,
    imageUrl,
    postId,
  });
}

/** Gönderi sahibi: alt koleksiyonları temizleyip gönderiyi siler. */
export async function deletePost(postId: string, requesterUid: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) throw new Error('Gönderi bulunamadı.');
  const data = postSnap.data() as Record<string, unknown>;
  if (String(data.authorUid ?? '') !== requesterUid) throw new Error('Bu gönderiyi silemezsiniz.');
  await deleteAllDocsInCollection(db, ['posts', postId, 'likes']);
  await deleteAllDocsInCollection(db, ['posts', postId, 'comments']);
  await deleteDoc(postRef);
}

/** Yorum sahibi: yorumu ve gönderi sayacını günceller. */
export async function deletePostComment(postId: string, commentId: string, requesterUid: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  const cref = doc(db, 'posts', postId, 'comments', commentId);
  const snap = await getDoc(cref);
  if (!snap.exists()) return;
  const authorUid = String((snap.data() as Record<string, unknown>).authorUid ?? '');
  if (authorUid !== requesterUid) throw new Error('Bu yorumu silemezsiniz.');
  await deleteDoc(cref);
  try {
    await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) });
  } catch {
    /* gönderi silinmiş olabilir */
  }
}

export async function addPostComment(
  postId: string,
  authorUid: string,
  authorName: string,
  text: string,
  postAuthorUid: string | undefined,
  postTitleHint: string,
  authorProfileImageUrl?: string,
  parentId?: string,
): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const t = text.trim();
  if (!t) return;
  const db = getFirestore(app);
  const cref = doc(collection(db, 'posts', postId, 'comments'));
  const postSnap = await getDoc(doc(db, 'posts', postId));
  const payload: Record<string, unknown> = {
    authorUid,
    authorName,
    text: t,
    createdAt: serverTimestamp(),
    postId,
  };
  if (postSnap.exists()) {
    const p = postSnap.data() as Record<string, unknown>;
    const ac = p.attachedContent as Record<string, unknown> | undefined;
    const acType = ac?.type;
    if (acType === 'book' || acType === 'movie' || acType === 'song') {
      const mappedType = acType === 'song' ? 'music' : acType;
      payload.contentType = mappedType;
      payload.contentId = String(ac?.id ?? '');
      payload.contentTitle = String(ac?.title ?? '');
      payload.contentKey = `${mappedType}:${String(ac?.id ?? '')}`;
    }
  }
  if (authorProfileImageUrl) payload.authorProfileImageUrl = authorProfileImageUrl;
  if (parentId) payload.parentId = parentId;
  await setDoc(cref, payload);
  await updateDoc(doc(db, 'posts', postId), {
    commentCount: increment(1),
  });
  if (postAuthorUid && postAuthorUid !== authorUid) {
    const nid = doc(collection(db, 'users', postAuthorUid, 'notifications')).id;
    await pushNotification(postAuthorUid, nid, {
      type: 'comment',
      fromUid: authorUid,
      fromDisplayName: authorName,
      postId,
      postTitle: postTitleHint,
    });
  }
}

export function subscribePostComments(
  postId: string,
  onNext: (comments: PostCommentDoc[]) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext([]);
    return () => {};
  }
  const db = getFirestore(app);
  return onSnapshot(
    collection(db, 'posts', postId, 'comments'),
    (snap) => {
      const rows: { item: PostCommentDoc; ms: number }[] = [];
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const ms = createdAtMillis(data);
        const apiu = data.authorProfileImageUrl;
        rows.push({
          ms,
          item: {
            id: d.id,
            authorUid: String(data.authorUid ?? ''),
            authorName: String(data.authorName ?? ''),
            authorProfileImageUrl: typeof apiu === 'string' && apiu.trim() ? apiu : undefined,
            text: String(data.text ?? ''),
            parentId: data.parentId ? String(data.parentId) : undefined,
            createdAtMs: ms > 0 ? ms : undefined,
            contentType:
              data.contentType === 'book' || data.contentType === 'movie' || data.contentType === 'music'
                ? data.contentType
                : undefined,
            contentId: typeof data.contentId === 'string' ? data.contentId : undefined,
            contentTitle: typeof data.contentTitle === 'string' ? data.contentTitle : undefined,
          },
        });
      });
      rows.sort((a, b) => a.ms - b.ms);
      onNext(rows.map((r) => r.item));
    },
    () => onNext([]),
  );
}

export function subscribeGlobalContentComments(
  contentType: 'book' | 'movie',
  contentId: string,
  onNext: (rows: GlobalContentCommentDoc[]) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext([]);
    return () => {};
  }
  const db = getFirestore(app);
  const contentKey = `${contentType}:${contentId}`;
  let commentRows: GlobalContentCommentDoc[] = [];
  let postRows: GlobalContentCommentDoc[] = [];

  const emit = async () => {
    const ratingsCol = collection(db, ratingCollection(contentType), contentId, 'ratings');
    const ratingsSnap = await getDocs(ratingsCol);
    const ratings = new Map<string, number>();
    ratingsSnap.forEach((d) => {
      const r = (d.data() as Record<string, unknown>).rating;
      if (typeof r === 'number') ratings.set(d.id, r);
    });
    const merged = [...postRows, ...commentRows]
      .map((x) => ({ ...x, rating: ratings.get(x.authorUid) }))
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
    onNext(merged);
  };

  const unsubComments = onSnapshot(
    query(collectionGroup(db, 'comments'), where('contentKey', '==', contentKey), orderBy('createdAt', 'desc'), limit(180)),
    (snap) => {
      const items: GlobalContentCommentDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const ms = createdAtMillis(data);
        items.push({
          id: d.id,
          postId: String(data.postId ?? ''),
          authorUid: String(data.authorUid ?? ''),
          authorName: String(data.authorName ?? ''),
          authorProfileImageUrl: typeof data.authorProfileImageUrl === 'string' ? data.authorProfileImageUrl : undefined,
          text: String(data.text ?? ''),
          createdAtMs: ms > 0 ? ms : undefined,
          kind: 'comment',
        });
      });
      commentRows = items;
      void emit();
    },
    () => onNext([]),
  );

  const targetAttachedType = contentType === 'book' ? 'book' : 'movie';
  const unsubPosts = onSnapshot(
    query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(240)),
    (snap) => {
      const items: GlobalContentCommentDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const attached = data.attachedContent as Record<string, unknown> | undefined;
        if (!attached) return;
        if (String(attached.type ?? '') !== targetAttachedType) return;
        if (String(attached.id ?? '') !== contentId) return;
        const ms = createdAtMillis(data);
        const excerpt = String(data.excerpt ?? '').trim();
        if (!excerpt) return;
        const ai = attached.imageUrl;
        items.push({
          id: `post_${d.id}`,
          postId: d.id,
          authorUid: String(data.authorUid ?? ''),
          authorName: String(data.authorName ?? ''),
          authorProfileImageUrl:
            typeof data.authorProfileImageUrl === 'string' ? data.authorProfileImageUrl : undefined,
          text: excerpt,
          createdAtMs: ms > 0 ? ms : undefined,
          kind: 'post',
          contentImageUrl: typeof ai === 'string' && ai.trim() ? ai : undefined,
        });
      });
      postRows = items;
      void emit();
    },
    () => onNext(commentRows),
  );

  return () => {
    unsubComments();
    unsubPosts();
  };
}

export async function deleteNotification(uid: string, notificationId: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'users', uid, 'notifications', notificationId));
}

export function subscribePostById(
  postId: string,
  onNext: (post: FeedPost | null) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext(null);
    return () => {};
  }
  const db = getFirestore(app);
  return onSnapshot(doc(db, 'posts', postId), (s) => {
    if (!s.exists()) {
      onNext(null);
      return;
    }
    onNext(mapPost(s.id, s.data() as Record<string, unknown>));
  });
}

/** Beğeni: `posts/{postId}/likes/{uid}` + `users/{uid}/likes/{postId}` atomik batch; bildirim gönderene. */
export async function togglePostLike(
  uid: string,
  displayName: string,
  post: {
    id: string;
    title: string;
    imageUrl: string;
    category: PostCategory;
    authorName?: string;
    authorUid?: string;
    excerpt?: string;
  },
): Promise<boolean> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  const userLikeRef = doc(db, 'users', uid, 'likes', post.id);
  const postLikeRef = doc(db, 'posts', post.id, 'likes', uid);
  const postRef = doc(db, 'posts', post.id);
  const snap = await getDoc(userLikeRef);

  if (snap.exists()) {
    const batch = writeBatch(db);
    batch.delete(userLikeRef);
    batch.delete(postLikeRef);
    batch.update(postRef, { likesCount: increment(-1) });
    await batch.commit();
    return false;
  }

  const img = post.imageUrl?.trim() ? post.imageUrl : PLACEHOLDER_IMAGE;
  const batch = writeBatch(db);

  batch.set(userLikeRef, {
    postId: post.id,
    contentId: post.id,
    title: post.title,
    imageUrl: img,
    category: post.category,
    subtitle: post.authorName ?? '',
    postAuthorUid: post.authorUid ?? null,
    excerpt: post.excerpt ?? '',
    createdAt: serverTimestamp(),
  });

  batch.set(postLikeRef, {
    uid,
    displayName,
    createdAt: serverTimestamp(),
  });

  batch.update(postRef, { likesCount: increment(1) });
  await batch.commit();

  if (post.authorUid && post.authorUid !== uid) {
    const nid = doc(collection(db, 'users', post.authorUid, 'notifications')).id;
    await pushNotification(post.authorUid, nid, {
      type: 'like',
      fromUid: uid,
      fromDisplayName: displayName,
      postId: post.id,
      postTitle: post.title,
    });
  }

  return true;
}

export function subscribeUserLikes(
  uid: string,
  onNext: (likes: UserLikeDoc[]) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext([]);
    return () => {};
  }
  const db = getFirestore(app);
  const likesCol = collection(db, 'users', uid, 'likes');
  return onSnapshot(
    likesCol,
    (snap) => {
      const rows: { item: UserLikeDoc; ms: number }[] = [];
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const cat = data.category;
        if (!isPostCategory(cat)) return;
        rows.push({
          ms: createdAtMillis(data),
          item: {
            contentId: String(data.contentId ?? d.id),
            title: String(data.title ?? ''),
            imageUrl: String(data.imageUrl ?? ''),
            category: cat,
            subtitle: String(data.subtitle ?? ''),
          },
        });
      });
      rows.sort((a, b) => b.ms - a.ms);
      onNext(rows.map((r) => r.item));
    },
    () => onNext([]),
  );
}

/** Belirli kullanıcının gönderileri (indeks gerekmez: son N gönderi içinden süzülür). */
export function subscribeUserPosts(
  authorUid: string,
  onNext: (posts: FeedPost[]) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext([]);
    return () => {};
  }
  const db = getFirestore(app);
  return onSnapshot(
    query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(120)),
    (snap) => {
      const out: FeedPost[] = [];
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        if (String(data.authorUid ?? '') !== authorUid) return;
        const row = mapPost(d.id, data);
        if (row) out.push(row);
      });
      onNext(out);
    },
    () => onNext([]),
  );
}

/** Kullanıcının koleksiyonlarını tek seferlik getirir. */
export async function getUserCollectionsOnce(uid: string): Promise<UserCollectionDoc[]> {
  const app = getFirebaseApp();
  if (!app) return [];
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'users', uid, 'collections'));
  const rows: { item: UserCollectionDoc; ms: number }[] = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const itemsRaw = data.items;
    const count = Array.isArray(itemsRaw) ? itemsRaw.length : 0;
    rows.push({
      ms: createdAtMillis(data),
      item: {
        id: d.id,
        name: String(data.name ?? 'Koleksiyon'),
        type: mapCollectionThemeType(data.type),
        itemsCount: count,
      },
    });
  });
  rows.sort((a, b) => b.ms - a.ms);
  return rows.map((r) => r.item);
}

export function subscribeUserCollections(
  uid: string,
  onNext: (items: UserCollectionDoc[]) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext([]);
    return () => {};
  }
  const db = getFirestore(app);
  return onSnapshot(collection(db, 'users', uid, 'collections'), (snap) => {
    const rows: { item: UserCollectionDoc; ms: number }[] = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const itemsRaw = data.items;
      const count = Array.isArray(itemsRaw) ? itemsRaw.length : 0;
      rows.push({
        ms: createdAtMillis(data),
        item: {
          id: d.id,
          name: String(data.name ?? 'Koleksiyon'),
          type: mapCollectionThemeType(data.type),
          itemsCount: count,
        },
      });
    });
    rows.sort((a, b) => b.ms - a.ms);
    onNext(rows.map((r) => r.item));
  });
}

export async function createUserCollection(
  uid: string,
  name: string,
  collType: CollectionThemeType = 'mixed',
): Promise<string> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const n = name.trim();
  if (!n) throw new Error('İsim gerekli.');
  const db = getFirestore(app);
  const ref = doc(collection(db, 'users', uid, 'collections'));
  await setDoc(ref, {
    name: n,
    type: collType,
    items: [],
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', uid), {
    collectionsCount: increment(1),
  });
  return ref.id;
}

/** Kayıtlı içeriği koleksiyon belgesindeki `items` dizisine ekler. */
export async function saveContentToUserCollection(
  ownerUid: string,
  collectionId: string,
  payload: CollectionSavedItemPayload,
): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  const entry = {
    entryId: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    postId: payload.postId,
    contentType: payload.contentType,
    title: payload.title,
    imageUrl: payload.imageUrl,
    externalUrl: payload.externalUrl,
    savedAtMs: Date.now(),
  };
  const safeEntry = sanitizeData(entry);
  await updateDoc(doc(db, 'users', ownerUid, 'collections', collectionId), {
    items: arrayUnion(safeEntry),
  });
}

/** Koleksiyon dizisinden tek öğeyi entryId ile siler. */
export async function removeItemFromCollection(
  uid: string,
  collectionId: string,
  entryId: string,
): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  const docRef = doc(db, 'users', uid, 'collections', collectionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const data = snap.data() as Record<string, unknown>;
  const items = Array.isArray(data.items) ? data.items : [];
  const filtered = (items as Record<string, unknown>[]).filter(
    (i) => i.entryId !== entryId,
  );
  await updateDoc(docRef, { items: filtered });
}

/** Koleksiyon sahibi: koleksiyon belgesini siler (öğeler `items` dizisindedir). */
export async function deleteUserCollection(ownerUid: string, collectionId: string, requesterUid: string): Promise<void> {
  if (ownerUid !== requesterUid) throw new Error('Bu koleksiyonu silemezsiniz.');
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'users', ownerUid, 'collections', collectionId));
  try {
    await updateDoc(doc(db, 'users', ownerUid), { collectionsCount: increment(-1) });
  } catch {
    /* */
  }
}

export function subscribeCollectionItems(
  userId: string,
  collectionId: string,
  onNext: (items: CollectionItemDoc[]) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext([]);
    return () => {};
  }
  const db = getFirestore(app);
  return onSnapshot(
    doc(db, 'users', userId, 'collections', collectionId),
    (snap) => {
      if (!snap.exists()) {
        onNext([]);
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      const itemsRaw = data.items;
      if (!Array.isArray(itemsRaw)) {
        onNext([]);
        return;
      }
      const parsed: { item: CollectionItemDoc; ms: number }[] = [];
      for (const raw of itemsRaw) {
        const item = mapCollectionItemFromStored(raw);
        if (item) parsed.push({ item, ms: item.savedAtMs ?? 0 });
      }
      parsed.sort((a, b) => b.ms - a.ms);
      onNext(parsed.map((r) => r.item));
    },
    () => onNext([]),
  );
}

export async function getBookRatingSummary(bookId: string): Promise<BookRatingSummary | null> {
  const app = getFirebaseApp();
  if (!app) return null;
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, 'bookRatings', bookId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    bookId,
    averageRating: typeof data.averageRating === 'number' ? data.averageRating : 0,
    totalRatings: typeof data.totalRatings === 'number' ? data.totalRatings : 0,
  };
}

function ratingCollection(kind: CatalogRatingKind): string {
  return kind === 'movie' ? 'movieRatings' : 'bookRatings';
}

function ratingKey(kind: CatalogRatingKind, id: string): string {
  return `${kind}:${id}`;
}

export async function getBookRatingsByIds(bookIds: string[]): Promise<Record<string, BookRatingSummary>> {
  const app = getFirebaseApp();
  if (!app || bookIds.length === 0) return {};
  const db = getFirestore(app);
  const unique = [...new Set(bookIds.filter(Boolean))].slice(0, 10);
  if (unique.length === 0) return {};
  const snap = await getDocs(query(collection(db, 'bookRatings'), where(documentId(), 'in', unique)));
  const out: Record<string, BookRatingSummary> = {};
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    out[d.id] = {
      bookId: d.id,
      averageRating: typeof data.averageRating === 'number' ? data.averageRating : 0,
      totalRatings: typeof data.totalRatings === 'number' ? data.totalRatings : 0,
    };
  });
  return out;
}

export async function getCatalogRatingsByRefs(
  refs: CatalogRatingRef[],
): Promise<Record<string, BookRatingSummary>> {
  const grouped = refs.reduce(
    (acc, r) => {
      if (!r.id) return acc;
      if (r.kind === 'movie') acc.movie.push(r.id);
      else acc.book.push(r.id);
      return acc;
    },
    { book: [] as string[], movie: [] as string[] },
  );
  const [books, movies] = await Promise.all([
    getBookRatingsByIds(grouped.book),
    getMovieRatingsByIds(grouped.movie),
  ]);
  const out: Record<string, BookRatingSummary> = {};
  Object.entries(books).forEach(([id, v]) => {
    out[ratingKey('book', id)] = v;
  });
  Object.entries(movies).forEach(([id, v]) => {
    out[ratingKey('movie', id)] = v;
  });
  return out;
}

export async function getMovieRatingsByIds(movieIds: string[]): Promise<Record<string, BookRatingSummary>> {
  const app = getFirebaseApp();
  if (!app || movieIds.length === 0) return {};
  const db = getFirestore(app);
  const unique = [...new Set(movieIds.filter(Boolean))].slice(0, 10);
  if (unique.length === 0) return {};
  const snap = await getDocs(query(collection(db, 'movieRatings'), where(documentId(), 'in', unique)));
  const out: Record<string, BookRatingSummary> = {};
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    out[d.id] = {
      bookId: d.id,
      averageRating: typeof data.averageRating === 'number' ? data.averageRating : 0,
      totalRatings: typeof data.totalRatings === 'number' ? data.totalRatings : 0,
    };
  });
  return out;
}

export async function rateBook(
  bookId: string,
  userId: string,
  rating: number,
): Promise<BookRatingSummary> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  if (!bookId.trim()) throw new Error('Kitap kimliği yok.');
  if (rating < 1 || rating > 5) throw new Error('Puan 1-5 arasında olmalı.');
  const db = getFirestore(app);
  const bookRef = doc(db, 'bookRatings', bookId);
  const userRatingRef = doc(db, 'bookRatings', bookId, 'ratings', userId);
  return runTransaction(db, async (tx) => {
    const [bookSnap, userSnap] = await Promise.all([tx.get(bookRef), tx.get(userRatingRef)]);
    const prevAvg = bookSnap.exists() ? Number((bookSnap.data() as Record<string, unknown>).averageRating ?? 0) : 0;
    const prevTotal = bookSnap.exists() ? Number((bookSnap.data() as Record<string, unknown>).totalRatings ?? 0) : 0;
    const prevUser = userSnap.exists() ? Number((userSnap.data() as Record<string, unknown>).rating ?? 0) : 0;
    const nextTotal = userSnap.exists() ? prevTotal : prevTotal + 1;
    const currentSum = prevAvg * prevTotal;
    const nextSum = userSnap.exists() ? currentSum - prevUser + rating : currentSum + rating;
    const nextAvg = nextTotal > 0 ? Number((nextSum / nextTotal).toFixed(2)) : 0;
    tx.set(
      bookRef,
      {
        averageRating: nextAvg,
        totalRatings: nextTotal,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(userRatingRef, { rating, updatedAt: serverTimestamp() }, { merge: true });
    return { bookId, averageRating: nextAvg, totalRatings: nextTotal };
  });
}

export async function rateCatalogItem(
  kind: CatalogRatingKind,
  itemId: string,
  userId: string,
  rating: number,
): Promise<BookRatingSummary> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  if (!itemId.trim()) throw new Error('İçerik kimliği yok.');
  if (rating < 1 || rating > 5) throw new Error('Puan 1-5 arasında olmalı.');
  const db = getFirestore(app);
  const col = ratingCollection(kind);
  const contentRef = doc(db, col, itemId);
  const userRatingRef = doc(db, col, itemId, 'ratings', userId);
  return runTransaction(db, async (tx) => {
    const [contentSnap, userSnap] = await Promise.all([tx.get(contentRef), tx.get(userRatingRef)]);
    const prevAvg = contentSnap.exists()
      ? Number((contentSnap.data() as Record<string, unknown>).averageRating ?? 0)
      : 0;
    const prevTotal = contentSnap.exists()
      ? Number((contentSnap.data() as Record<string, unknown>).totalRatings ?? 0)
      : 0;
    const prevUser = userSnap.exists() ? Number((userSnap.data() as Record<string, unknown>).rating ?? 0) : 0;
    const nextTotal = userSnap.exists() ? prevTotal : prevTotal + 1;
    const currentSum = prevAvg * prevTotal;
    const nextSum = userSnap.exists() ? currentSum - prevUser + rating : currentSum + rating;
    const nextAvg = nextTotal > 0 ? Number((nextSum / nextTotal).toFixed(2)) : 0;
    tx.set(
      contentRef,
      { averageRating: nextAvg, totalRatings: nextTotal, updatedAt: serverTimestamp() },
      { merge: true },
    );
    tx.set(userRatingRef, { rating, updatedAt: serverTimestamp() }, { merge: true });
    return { bookId: itemId, averageRating: nextAvg, totalRatings: nextTotal };
  });
}

export async function searchUsersByDisplayName(q: string): Promise<UserSearchRow[]> {
  const app = getFirebaseApp();
  if (!app) return [];
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const db = getFirestore(app);
  try {
    const qi = query(
      collection(db, 'users'),
      orderBy('displayName'),
      startAt(trimmed),
      endAt(`${trimmed}\uf8ff`),
      limit(24),
    );
    const snap = await getDocs(qi);
    const out: UserSearchRow[] = [];
    snap.forEach((d) => {
      const data = d.data() as UserProfileDoc;
      const dn = data.displayName;
      if (!dn || typeof dn !== 'string') return;
      const row: UserSearchRow = {
        uid: d.id,
        displayName: dn,
        isPrivate: data.isPrivate === true,
      };
      if (data.profileImageUrl) row.profileImageUrl = data.profileImageUrl;
      out.push(row);
    });
    return out;
  } catch {
    const snap = await getDocs(query(collection(db, 'users'), limit(40)));
    const lower = trimmed.toLowerCase();
    const out: UserSearchRow[] = [];
    snap.forEach((d) => {
      const data = d.data() as UserProfileDoc;
      const dn = data.displayName;
      if (!dn || typeof dn !== 'string') return;
      if (!dn.toLowerCase().includes(lower)) return;
      const row: UserSearchRow = {
        uid: d.id,
        displayName: dn,
        isPrivate: data.isPrivate === true,
      };
      if (data.profileImageUrl) row.profileImageUrl = data.profileImageUrl;
      out.push(row);
    });
    return out.slice(0, 24);
  }
}

export async function isFollowing(viewerUid: string, targetUid: string): Promise<boolean> {
  const app = getFirebaseApp();
  if (!app) return false;
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, 'users', viewerUid, 'following', targetUid));
  return snap.exists();
}

export async function hasPendingFollowRequest(fromUid: string, targetUid: string): Promise<boolean> {
  const app = getFirebaseApp();
  if (!app) return false;
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, 'users', targetUid, 'followRequests', fromUid));
  return snap.exists();
}

export async function followUser(
  fromUid: string,
  fromDisplayName: string,
  toUid: string,
  targetIsPrivate: boolean,
): Promise<'followed' | 'requested'> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  if (fromUid === toUid) throw new Error('Kendinizi takip edemezsiniz.');
  const db = getFirestore(app);

  const already = await isFollowing(fromUid, toUid);
  if (already) return 'followed';

  if (!targetIsPrivate) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', toUid, 'followers', fromUid), { createdAt: serverTimestamp() });
    batch.set(doc(db, 'users', fromUid, 'following', toUid), { createdAt: serverTimestamp() });
    batch.update(doc(db, 'users', toUid), { followersCount: increment(1) });
    batch.update(doc(db, 'users', fromUid), { followingCount: increment(1) });
    await batch.commit();
    const nid = doc(collection(db, 'users', toUid, 'notifications')).id;
    await pushNotification(toUid, nid, {
      type: 'new_follower',
      fromUid,
      fromDisplayName,
    });
    return 'followed';
  }

  await setDoc(doc(db, 'users', toUid, 'followRequests', fromUid), {
    fromUid,
    fromDisplayName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  await pushNotification(toUid, `follow_req_${fromUid}`, {
    type: 'follow_request',
    fromUid,
    fromDisplayName,
  });
  return 'requested';
}

export async function unfollowUser(fromUid: string, toUid: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  const f1 = await getDoc(doc(db, 'users', fromUid, 'following', toUid));
  if (!f1.exists()) return;
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', toUid, 'followers', fromUid));
  batch.delete(doc(db, 'users', fromUid, 'following', toUid));
  batch.update(doc(db, 'users', toUid), { followersCount: increment(-1) });
  batch.update(doc(db, 'users', fromUid), { followingCount: increment(-1) });
  await batch.commit();
}

export async function acceptFollowRequest(viewerUid: string, fromUid: string, viewerDisplayName: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'users', viewerUid, 'followRequests', fromUid));
  await deleteDoc(doc(db, 'users', viewerUid, 'notifications', `follow_req_${fromUid}`)).catch(() => {});
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', viewerUid, 'followers', fromUid), { createdAt: serverTimestamp() });
  batch.set(doc(db, 'users', fromUid, 'following', viewerUid), { createdAt: serverTimestamp() });
  batch.update(doc(db, 'users', viewerUid), { followersCount: increment(1) });
  batch.update(doc(db, 'users', fromUid), { followingCount: increment(1) });
  await batch.commit();
  const nid = doc(collection(db, 'users', fromUid, 'notifications')).id;
  await pushNotification(fromUid, nid, {
    type: 'new_follower',
    fromUid: viewerUid,
    fromDisplayName: viewerDisplayName,
  });
}

export async function rejectFollowRequest(viewerUid: string, fromUid: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'users', viewerUid, 'followRequests', fromUid));
  await deleteDoc(doc(db, 'users', viewerUid, 'notifications', `follow_req_${fromUid}`)).catch(() => {});
}

export function subscribeNotifications(
  uid: string,
  onNext: (items: NotificationDoc[]) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext([]);
    return () => {};
  }
  const db = getFirestore(app);
  return onSnapshot(
    collection(db, 'users', uid, 'notifications'),
    (snap) => {
      const rows: { item: NotificationDoc; ms: number }[] = [];
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const type = data.type;
        if (
          type !== 'follow_request' &&
          type !== 'new_follower' &&
          type !== 'like' &&
          type !== 'comment'
        ) {
          return;
        }
        rows.push({
          ms: createdAtMillis(data),
          item: {
            id: d.id,
            type,
            fromUid: String(data.fromUid ?? ''),
            fromDisplayName: String(data.fromDisplayName ?? ''),
            postId: data.postId ? String(data.postId) : undefined,
            postTitle: data.postTitle ? String(data.postTitle) : undefined,
            read: data.read === true,
          },
        });
      });
      rows.sort((a, b) => b.ms - a.ms);
      onNext(rows.map((r) => r.item));
    },
    () => onNext([]),
  );
}

export function subscribeFollowUsernames(
  targetUid: string,
  mode: 'followers' | 'following',
  onNext: (rows: FollowListRow[]) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext([]);
    return () => {};
  }
  const db = getFirestore(app);
  const colName = mode === 'followers' ? 'followers' : 'following';
  return onSnapshot(collection(db, 'users', targetUid, colName), (snap) => {
    const uids = snap.docs.map((d) => d.id);
    void Promise.all(
      uids.map(async (id) => {
        const p = await getUserProfileOnce(id);
        const row: FollowListRow = {
          uid: id,
          label: p?.displayName || p?.email?.split('@')[0] || id.slice(0, 8),
        };
        if (p?.profileImageUrl?.trim()) row.profileImageUrl = p.profileImageUrl.trim();
        return row;
      }),
    ).then(onNext);
  });
}

/** Okunmamış bildirim sayısına abone ol. */
export function subscribeUnreadNotificationCount(
  uid: string,
  onNext: (count: number) => void,
): () => void {
  const app = getFirebaseApp();
  if (!app) {
    onNext(0);
    return () => {};
  }
  const db = getFirestore(app);
  return onSnapshot(
    collection(db, 'users', uid, 'notifications'),
    (snap) => {
      let count = 0;
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        if (data.read !== true) count++;
      });
      onNext(count);
    },
    () => onNext(0),
  );
}

/** Tüm bildirimleri okundu olarak işaretle. */
export async function markNotificationsRead(uid: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'users', uid, 'notifications'));
  const unread = snap.docs.filter((d) => (d.data() as Record<string, unknown>).read !== true);
  if (unread.length === 0) return;
  for (let i = 0; i < unread.length; i += 400) {
    const batch = writeBatch(db);
    unread.slice(i, i + 400).forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  }
}

/** Gönderi metnini güncelle (yalnızca yazar). */
export async function updatePostText(postId: string, requesterUid: string, newText: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) throw new Error('Gönderi bulunamadı.');
  const data = postSnap.data() as Record<string, unknown>;
  if (String(data.authorUid ?? '') !== requesterUid) throw new Error('Bu gönderiyi düzenleyemezsiniz.');
  const body = newText.trim();
  if (!body) throw new Error('Metin boş olamaz.');
  await updateDoc(postRef, {
    title: body.slice(0, 80),
    excerpt: body,
    updatedAt: serverTimestamp(),
  });
}

/** Gönderi raporla. */
export async function reportPost(postId: string, reporterUid: string, reason: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');
  const db = getFirestore(app);
  const ref = doc(collection(db, 'reports'));
  await setDoc(ref, {
    postId,
    reporterUid,
    reason: reason.trim() || 'Uygunsuz içerik',
    createdAt: serverTimestamp(),
  });
}
