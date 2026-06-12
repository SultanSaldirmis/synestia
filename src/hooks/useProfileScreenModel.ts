import { useEffect, useMemo, useState } from 'react';
import type { FeedPost } from '../data/mockData';
import {
  getCatalogRatingsByRefs,
  subscribeUserCollections,
  subscribeUserLikes,
  subscribeUserPosts,
  subscribeUserProfile,
  type UserCollectionDoc,
  type UserLikeDoc,
  type UserProfileDoc,
} from '../services/firestoreService';

export function useProfileScreenModel(uid: string | undefined, firebaseConfigured: boolean) {
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [likes, setLikes] = useState<UserLikeDoc[]>([]);
  const [collections, setCollections] = useState<UserCollectionDoc[]>([]);
  const [userPosts, setUserPosts] = useState<FeedPost[]>([]);
  const [contentRatings, setContentRatings] = useState<
    Record<string, { averageRating: number; totalRatings: number }>
  >({});
  const [nowMs, setNowMs] = useState(() => Date.now());

  const orderedUserPosts = useMemo(
    () =>
      userPosts
        .slice()
        .sort(
          (a, b) =>
            (b.createdAtMs ?? b.createdAtClientMs ?? 0) - (a.createdAtMs ?? a.createdAtClientMs ?? 0),
        ),
    [userPosts],
  );

  useEffect(() => {
    if (!uid || !firebaseConfigured) {
      setProfile(null);
      return;
    }
    return subscribeUserProfile(uid, setProfile);
  }, [uid, firebaseConfigured]);

  useEffect(() => {
    const refs = orderedUserPosts
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
  }, [orderedUserPosts]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!uid || !firebaseConfigured) {
      setLikes([]);
      return;
    }
    return subscribeUserLikes(uid, setLikes);
  }, [uid, firebaseConfigured]);

  useEffect(() => {
    if (!uid || !firebaseConfigured) {
      setCollections([]);
      return;
    }
    return subscribeUserCollections(uid, setCollections);
  }, [uid, firebaseConfigured]);

  useEffect(() => {
    if (!uid || !firebaseConfigured) {
      setUserPosts([]);
      return;
    }
    return subscribeUserPosts(uid, setUserPosts);
  }, [uid, firebaseConfigured]);

  return {
    profile,
    userPosts,
    orderedUserPosts,
    likes,
    collections,
    contentRatings,
    nowMs,
  };
}
