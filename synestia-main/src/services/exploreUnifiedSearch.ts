import type { SearchResult } from '../types/searchResult';
import { getCatalogRatingsByRefs, searchUsersByDisplayName } from './firestoreService';
import {
  searchBooksAsResults,
  searchSpotifyTracksAsResults,
  searchTmdbMoviesAsResults,
} from './apiService';

function logFirestoreSearchError(e: unknown): void {
  console.error('[Synestia API][Firestore][user_search]', {
    code: 'USER_SEARCH_FAILED',
    message: e instanceof Error ? e.message : String(e),
  });
}

function mapUsersToResults(rows: Awaited<ReturnType<typeof searchUsersByDisplayName>>): SearchResult[] {
  return rows.map((u) => ({
    id: `user_${u.uid}`,
    title: u.displayName,
    subtitle: u.isPrivate ? 'Gizli profil' : 'Kullanıcı',
    imageUrl: '',
    type: 'user' as const,
    userUid: u.uid,
    profileImageStored: u.profileImageUrl,
  }));
}

/**
 * TMDB + Spotify + Open Library + (isteğe bağlı) Firestore kullanıcı araması — tek Promise.all.
 */
export async function runExploreUnifiedSearch(
  query: string,
  options: { includeUsers: boolean },
): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const userTask: Promise<SearchResult[]> = options.includeUsers
    ? searchUsersByDisplayName(q)
        .then(mapUsersToResults)
        .catch((e) => {
          logFirestoreSearchError(e);
          return [];
        })
    : Promise.resolve([]);

  const [users, movies, music, books] = await Promise.all([
    userTask,
    searchTmdbMoviesAsResults(q),
    searchSpotifyTracksAsResults(q),
    searchBooksAsResults(q),
  ]);
  const ratings = await getCatalogRatingsByRefs([
    ...books.map((b) => ({ kind: 'book' as const, id: b.id })),
    ...movies.map((m) => ({ kind: 'movie' as const, id: m.id.replace(/^tmdb_/, '') })),
  ]);
  const booksWithRatings = books.map((b) => {
    const r = ratings[`book:${b.id}`];
    return r
      ? { ...b, averageRating: r.averageRating, totalRatings: r.totalRatings }
      : b;
  });
  const moviesWithRatings = movies.map((m) => {
    const r = ratings[`movie:${m.id.replace(/^tmdb_/, '')}`];
    return r ? { ...m, averageRating: r.averageRating, totalRatings: r.totalRatings } : m;
  });
  return [...users, ...moviesWithRatings, ...music, ...booksWithRatings];
}
