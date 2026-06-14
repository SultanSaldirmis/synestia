import { useCallback, useEffect, useRef, useState } from 'react';
import { isFirebaseConfigured } from '../config/firebase';
import { runExploreUnifiedSearch } from '../services/exploreUnifiedSearch';
import type { SearchResult } from '../types/searchResult';
import type { PostCategory } from '../components';

export type ExploreFilterKey = 'all' | PostCategory | 'user';

export function useExploreScreenModel() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ExploreFilterKey>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const rows = await runExploreUnifiedSearch(trimmed, {
        includeUsers: isFirebaseConfigured(),
      });
      setResults(rows);
    } catch (e) {
      console.error('[Synestia][ExploreScreen] unified search threw', {
        code: 'UNHANDLED',
        message: e instanceof Error ? e.message : String(e),
      });
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void doSearch(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const onSubmit = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void doSearch(query);
  }, [query, doSearch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    doSearch(query).finally(() => setRefreshing(false));
  }, [query, doSearch]);

  const filtered =
    filter === 'all' ? results : results.filter((item) => item.type === filter);

  return {
    query,
    setQuery,
    filter,
    setFilter,
    results,
    searching,
    refreshing,
    hasSearched,
    filtered,
    onSubmit,
    onRefresh,
  };
}
