/**
 * Dış API: TMDB (film), Spotify (müzik), Open Library (kitap — API anahtarı gerekmez).
 *
 * .env (EXPO_PUBLIC_*):
 *   EXPO_PUBLIC_TMDB_API_KEY
 *   EXPO_PUBLIC_SPOTIFY_CLIENT_ID
 *   EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET
 */

import axios from 'axios';
import type { SearchResult } from '../types/searchResult';

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';

const TMDB_BASE = 'https://api.themoviedb.org/3';

/** Geriye uyumluluk — eski Explore tipleri. */
export type ApiContentItem = {
  id: string;
  title: string;
  category: 'movie' | 'music' | 'book';
  description: string;
  imageUrl: string;
};

function logApiError(
  provider: 'Spotify' | 'TMDB' | 'Open Library',
  phase: string,
  detail: Record<string, unknown>,
): void {
  const code = String(detail.code ?? '');
  const status = typeof detail.status === 'number' ? detail.status : undefined;
  const transient =
    code === 'ECONNABORTED' ||
    code === 'ERR_NETWORK' ||
    code === 'ETIMEDOUT' ||
    (typeof status === 'number' && status >= 500);
  const log = transient ? console.warn : console.error;
  log(`[Synestia API][${provider}] ${phase}`, detail);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTmdbKey(): string {
  return (process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '').trim();
}

function getSpotifyCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: (process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '').trim(),
    clientSecret: (process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET ?? '').trim(),
  };
}

/** Latin-1 (Spotify client id/secret ASCII) için Basic auth; btoa yoksa yedek. */
function encodeBasicAuth(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`;
  if (typeof globalThis.btoa === 'function') {
    try {
      return globalThis.btoa(raw);
    } catch {
      /* Hermes / özel karakter */
    }
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < raw.length; i += 3) {
    const b1 = raw.charCodeAt(i);
    const b2 = i + 1 < raw.length ? raw.charCodeAt(i + 1) : 0;
    const b3 = i + 2 < raw.length ? raw.charCodeAt(i + 2) : 0;
    const triple = (b1 << 16) | (b2 << 8) | b3;
    const pad = raw.length - i;
    out += alphabet[(triple >> 18) & 63];
    out += alphabet[(triple >> 12) & 63];
    out += pad >= 2 ? alphabet[(triple >> 6) & 63] : '=';
    out += pad >= 3 ? alphabet[triple & 63] : '=';
  }
  return out;
}

/* ---------- Spotify: Client Credentials + token önbelleği ---------- */

let spotifyAccessToken: string | null = null;
/** epoch ms — token bu zamandan önce yenilenir */
let spotifyTokenRefreshAt = 0;

const SPOTIFY_TOKEN_SKEW_MS = 60_000;

async function fetchSpotifyAccessToken(): Promise<string | null> {
  const { clientId, clientSecret } = getSpotifyCredentials();
  if (!clientId || !clientSecret) {
    logApiError('Spotify', 'token_request_skipped', {
      code: 'MISSING_CREDENTIALS',
      message: 'EXPO_PUBLIC_SPOTIFY_CLIENT_ID / SECRET tanımlı değil.',
    });
    return null;
  }

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${encodeBasicAuth(clientId, clientSecret)}`,
      },
      body: 'grant_type=client_credentials',
    });
    const text = await res.text();
    if (!res.ok) {
      let errorCode = `HTTP_${res.status}`;
      try {
        const j = JSON.parse(text) as { error?: string; error_description?: string };
        if (j.error) errorCode = j.error;
        logApiError('Spotify', 'token_request_failed', {
          status: res.status,
          code: errorCode,
          message: j.error_description ?? text.slice(0, 500),
        });
      } catch {
        logApiError('Spotify', 'token_request_failed', {
          status: res.status,
          code: errorCode,
          message: text.slice(0, 500),
        });
      }
      return null;
    }
    const data = JSON.parse(text) as { access_token?: string; expires_in?: number };
    const token = data.access_token;
    if (!token) {
      logApiError('Spotify', 'token_response_invalid', { code: 'NO_ACCESS_TOKEN', raw: text.slice(0, 200) });
      return null;
    }
    const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    spotifyAccessToken = token;
    spotifyTokenRefreshAt = Date.now() + expiresInSec * 1000 - SPOTIFY_TOKEN_SKEW_MS;
    return token;
  } catch (e) {
    logApiError('Spotify', 'token_network_error', {
      code: 'NETWORK',
      message: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/** Geçerli Bearer token; süresi dolmuşsa yeniler (~3600s). */
export async function ensureSpotifyAccessToken(): Promise<string | null> {
  if (spotifyAccessToken && Date.now() < spotifyTokenRefreshAt) {
    return spotifyAccessToken;
  }
  return fetchSpotifyAccessToken();
}

/* ---------- TMDB ---------- */

export async function searchTmdbMoviesAsResults(query: string): Promise<SearchResult[]> {
  const key = getTmdbKey();
  if (!key) {
    logApiError('TMDB', 'search_skipped', {
      code: 'MISSING_API_KEY',
      message: 'EXPO_PUBLIC_TMDB_API_KEY tanımlı değil.',
    });
    return [];
  }
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const params = new URLSearchParams({
      api_key: key,
      query: trimmed,
      language: 'tr-TR',
      page: '1',
    });
    const url = `${TMDB_BASE}/search/movie?${params.toString()}`;
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      logApiError('TMDB', 'search_failed', {
        status: res.status,
        code: `HTTP_${res.status}`,
        message: text.slice(0, 500),
      });
      return [];
    }
    const data = JSON.parse(text) as { results?: Array<{ id: number; title?: string; original_title?: string; overview?: string; poster_path?: string | null }> };
    const results = data.results ?? [];
    return results.slice(0, 8).map((m) => {
      const overview = (m.overview ?? '').trim();
      return {
        id: `tmdb_${m.id}`,
        title: m.title ?? m.original_title ?? '',
        subtitle: overview.slice(0, 160) || 'Film açıklaması yok.',
        imageUrl: m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : '',
        type: 'movie' as const,
      };
    });
  } catch (e) {
    logApiError('TMDB', 'search_network_error', {
      code: 'NETWORK',
      message: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

/* ---------- Spotify arama ---------- */

export async function searchSpotifyTracksAsResults(query: string): Promise<SearchResult[]> {
  const token = await ensureSpotifyAccessToken();
  if (!token) return [];
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(trimmed)}&type=track&market=TR&limit=8`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401) {
        spotifyAccessToken = null;
        spotifyTokenRefreshAt = 0;
      }
      let apiCode = `HTTP_${res.status}`;
      let apiMessage = text.slice(0, 500);
      try {
        const j = JSON.parse(text) as { error?: { status?: number; message?: string } };
        if (j.error?.status != null) apiCode = `SPOTIFY_${j.error.status}`;
        if (j.error?.message) apiMessage = j.error.message;
      } catch {
        /* ham gövde */
      }
      logApiError('Spotify', 'search_failed', {
        status: res.status,
        code: apiCode,
        message: apiMessage,
      });
      return [];
    }
    const data = JSON.parse(text) as {
      tracks?: {
        items?: Array<{
          id: string;
          name?: string;
          artists?: Array<{ name?: string }>;
          album?: { images?: Array<{ url?: string }> };
          preview_url?: string | null;
        }>;
      };
    };
    const tracks = data.tracks?.items ?? [];
    return tracks.map((t) => {
      const artists = (t.artists ?? []).map((a) => a.name).filter(Boolean).join(', ');
      const img = t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? '';
      return {
        id: `spotify_${t.id}`,
        title: t.name ?? '',
        subtitle: artists || 'Bilinmeyen sanatçı',
        imageUrl: img,
        type: 'music' as const,
        previewUrl: typeof t.preview_url === 'string' && t.preview_url.trim() ? t.preview_url : undefined,
        externalUrl: `https://open.spotify.com/track/${encodeURIComponent(t.id)}`,
      };
    });
  } catch (e) {
    logApiError('Spotify', 'search_network_error', {
      code: 'NETWORK',
      message: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

/* ---------- Open Library (kitap) ---------- */

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibraryDoc[];
};

/** `SearchResult.id` ↔ Open Library `key` (örn. `/works/OL45804W`). */
export function encodeOpenLibraryKey(pathKey: string): string {
  const tail = pathKey.startsWith('/') ? pathKey.slice(1) : pathKey;
  return `openlib_${tail.split('/').join('__')}`;
}

export function decodeOpenLibrarySearchId(id: string): string {
  if (!id.startsWith('openlib_')) return id;
  const rest = id.slice('openlib_'.length);
  return '/' + rest.split('__').join('/');
}

function openLibraryCoverUrl(item: OpenLibraryDoc): string {
  if (typeof item.cover_i === 'number' && Number.isFinite(item.cover_i)) {
    return `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`;
  }
  const isbns = item.isbn;
  if (Array.isArray(isbns) && isbns.length > 0) {
    const first = String(isbns[0] ?? '').trim();
    if (first) return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(first)}-L.jpg`;
  }
  return '';
}

/**
 * Open Library Search API — anahtar gerekmez.
 * @see https://openlibrary.org/dev/docs/api/search
 */
export async function searchBooksAsResults(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length < 3) return [];

  const timeouts = [10_000, 15_000];
  for (let attempt = 0; attempt < timeouts.length; attempt++) {
    try {
      const { data, status } = await axios.get<OpenLibrarySearchResponse>(OPEN_LIBRARY_SEARCH, {
        params: { q: trimmed, limit: 10 },
        timeout: timeouts[attempt],
        validateStatus: (s) => s === 200,
      });

      if (!data || typeof data !== 'object') {
        logApiError('Open Library', 'invalid_response', { code: 'EMPTY_BODY', status });
        return [];
      }

      const docs = Array.isArray(data.docs) ? data.docs.slice(0, 10) : [];
      if (docs.length === 0) return [];

      const rows: SearchResult[] = [];
      for (const item of docs) {
        const key = typeof item.key === 'string' ? item.key.trim() : '';
        if (!key) continue;
        const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Başlıksız';
        const authors = item.author_name;
        const subtitle =
          Array.isArray(authors) && authors.length > 0 && typeof authors[0] === 'string'
            ? authors[0]
            : 'Bilinmeyen Yazar';
        rows.push({
          id: encodeOpenLibraryKey(key),
          title,
          subtitle,
          imageUrl: openLibraryCoverUrl(item),
          type: 'book' as const,
        });
      }

      if (rows.length === 0 && docs.length > 0) {
        console.warn('[Synestia API][Open Library] docs_missing_keys', { query: trimmed, docCount: docs.length });
      }

      return rows;
    } catch (e) {
      const isLastAttempt = attempt === timeouts.length - 1;
      if (axios.isAxiosError(e)) {
        const code = e.code ?? 'AXIOS_ERROR';
        const status = e.response?.status;
        const transient =
          code === 'ECONNABORTED' ||
          code === 'ERR_NETWORK' ||
          code === 'ETIMEDOUT' ||
          (typeof status === 'number' && status >= 500);
        if (!isLastAttempt && transient) {
          await sleep(400);
          continue;
        }
        logApiError('Open Library', 'search_failed', {
          code,
          status,
          message: e.message,
          responseSnippet:
            typeof e.response?.data === 'string'
              ? e.response.data.slice(0, 400)
              : JSON.stringify(e.response?.data ?? '').slice(0, 400),
        });
      } else {
        logApiError('Open Library', 'search_failed', {
          code: 'UNKNOWN',
          message: e instanceof Error ? e.message : String(e),
        });
      }
      return [];
    }
  }

  return [];
}

/** Üç kaynağı paralel çağırır (Keşfet + Firestore için ayrı katman). */
export async function searchExternalApisParallel(query: string): Promise<SearchResult[]> {
  const [movies, music, books] = await Promise.all([
    searchTmdbMoviesAsResults(query),
    searchSpotifyTracksAsResults(query),
    searchBooksAsResults(query),
  ]);
  return [...movies, ...music, ...books];
}

/* ---------- Geriye dönük: ApiContentItem ---------- */

function toApiContentItem(r: SearchResult): ApiContentItem {
  return {
    id: r.id,
    title: r.title,
    category: r.type === 'user' ? 'book' : r.type,
    description: r.subtitle,
    imageUrl: r.imageUrl,
  };
}

/** @deprecated Keşfet `runExploreUnifiedSearch` kullanır. */
export async function searchMovies(query: string): Promise<ApiContentItem[]> {
  const rows = await searchTmdbMoviesAsResults(query);
  return rows.map(toApiContentItem);
}

export async function searchMusic(query: string): Promise<ApiContentItem[]> {
  const rows = await searchSpotifyTracksAsResults(query);
  return rows.map(toApiContentItem);
}

export async function searchBooks(query: string): Promise<ApiContentItem[]> {
  const rows = await searchBooksAsResults(query);
  return rows.map(toApiContentItem);
}

export async function searchAllContent(query: string): Promise<ApiContentItem[]> {
  const unified = await searchExternalApisParallel(query);
  return unified.map(toApiContentItem);
}
