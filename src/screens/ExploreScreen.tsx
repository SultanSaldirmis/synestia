import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CachedImage, FilterChip, ScreenSafeArea, SearchBar, StarRating } from '../components';
import type { PostCategory } from '../components';
import { NO_SEARCH_IMAGE_URI } from '../constants/searchPlaceholder';
import { isFirebaseConfigured } from '../config/firebase';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { runExploreUnifiedSearch } from '../services/exploreUnifiedSearch';
import type { SearchResult } from '../types/searchResult';
import { profileImageDisplayUri } from '../utils/profileImage';
import { colors, radii, roundLayout, scale, spacing, spacingVertical, typography } from '../theme';

type ExploreNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Explore'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type FilterKey = 'all' | PostCategory | 'user';

const { width: windowWidth } = Dimensions.get('window');
const thumbSize = roundLayout(Math.min(scale(56), windowWidth * 0.16));

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.18,
    shadowRadius: scale(6),
  },
  android: { elevation: 4 },
  default: {},
});

const tabSafeEdges = ['top', 'left', 'right', 'bottom'] as const;

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  movie: 'Film',
  music: 'Müzik',
  book: 'Kitap',
  user: 'Kullanıcı',
};

export function ExploreScreen() {
  const navigation = useNavigation<ExploreNav>();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
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
  }, [user?.uid]);

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
    Keyboard.dismiss();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void doSearch(query);
  }, [query, doSearch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    doSearch(query).finally(() => setRefreshing(false));
  }, [query, doSearch]);

  const filtered =
    filter === 'all' ? results : results.filter((item) => item.type === filter);

  const openResult = useCallback(
    (item: SearchResult) => {
      if (item.type === 'user' && item.userUid) {
        if (item.userUid === user?.uid) {
          navigation.navigate('MainTabs', { screen: 'Profile' });
          return;
        }
        navigation.navigate('UserProfile', { userId: item.userUid });
        return;
      }
      if (item.type === 'book' || item.type === 'movie') {
        navigation.navigate('ItemDetail', {
          itemType: item.type,
          itemId: item.type === 'movie' ? item.id.replace(/^tmdb_/, '') : item.id,
          title: item.title,
          imageUrl: item.imageUrl?.trim() || undefined,
        });
        return;
      }
      if (item.type === 'music') {
        const spotifyUrl =
          item.externalUrl ?? `https://open.spotify.com/search/${encodeURIComponent(item.title)}`;
        void Linking.openURL(spotifyUrl);
        return;
      }
      const detailCategory: PostCategory = 'text';
      navigation.navigate('Detail', {
        id: item.id,
        title: item.title,
        category: detailCategory,
        description: item.subtitle,
        imageUrl: item.imageUrl?.trim() || undefined,
        body: item.subtitle,
      });
    },
    [navigation, user?.uid],
  );

  return (
    <ScreenSafeArea edges={tabSafeEdges}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
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
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Kullanıcı, kitap, film veya müzik ara..."
          onSubmitEditing={onSubmit}
        />

        {hasSearched && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            <FilterChip label="Tümü" selected={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterChip label="Kullanıcı" selected={filter === 'user'} onPress={() => setFilter('user')} />
            <FilterChip label="Müzik" selected={filter === 'music'} onPress={() => setFilter('music')} />
            <FilterChip label="Film" selected={filter === 'movie'} onPress={() => setFilter('movie')} />
            <FilterChip label="Kitap" selected={filter === 'book'} onPress={() => setFilter('book')} />
          </ScrollView>
        )}

        {searching && (
          <ActivityIndicator color={colors.accentPurple} style={styles.spinner} size="small" />
        )}

        {filtered.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Sonuçlar ({filtered.length})</Text>
            {filtered.map((item) => {
              const isUser = item.type === 'user';
              const userUri = isUser ? profileImageDisplayUri(item.profileImageStored) : undefined;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.resultRow, cardShadow, pressed && styles.rowPressed]}
                  onPress={() => openResult(item)}
                >
                  {isUser ? (
                    userUri ? (
                      <CachedImage uri={userUri} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPh]}>
                        <Text style={styles.thumbPhTxt}>{item.title.charAt(0).toUpperCase()}</Text>
                      </View>
                    )
                  ) : item.imageUrl?.trim() ? (
                    <CachedImage uri={item.imageUrl} style={styles.thumb} />
                  ) : (
                    <CachedImage uri={NO_SEARCH_IMAGE_URI} style={styles.thumb} />
                  )}
                  <View style={styles.resultText}>
                    <Text style={styles.resultTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.resultMeta}>{TYPE_LABEL[item.type]}</Text>
                    {item.type === 'book' || item.type === 'movie' ? (
                      typeof item.averageRating === 'number' ? (
                        <StarRating rating={item.averageRating} totalRatings={item.totalRatings ?? 0} size={scale(12)} />
                      ) : (
                        <Text style={styles.unrated}>Henüz puanlanmadı</Text>
                      )
                    ) : null}
                    <Text style={styles.resultDesc} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {hasSearched && !searching && filtered.length === 0 && (
          <Text style={styles.empty}>Sonuç bulunamadı.</Text>
        )}

        {!hasSearched && !searching && (
          <View style={styles.initialState}>
            <Text style={styles.initialIcon}>🔍</Text>
            <Text style={styles.initialText}>
              Kullanıcı, film, kitap veya müzik aramak için yukarıya yazın.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacingVertical.sm,
  },
  listContent: { paddingBottom: spacingVertical.xxl, flexGrow: 1 },
  chipsScroll: { flexGrow: 0, marginTop: spacingVertical.md, marginBottom: spacingVertical.xs },
  chipsRow: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.lg },
  spinner: { marginVertical: spacingVertical.lg },
  section: { marginTop: spacingVertical.md },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacingVertical.sm,
    textTransform: 'uppercase',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.sm,
    marginBottom: spacingVertical.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: { opacity: 0.88 },
  thumb: {
    width: thumbSize,
    height: thumbSize,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    marginRight: spacing.md,
  },
  thumbPh: { justifyContent: 'center', alignItems: 'center' },
  thumbPhTxt: { fontWeight: '700', color: colors.accentPurple, fontSize: scale(18) },
  resultText: { flex: 1 },
  resultTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '600' },
  resultMeta: {
    ...typography.meta,
    color: colors.accentPurple,
    marginTop: spacingVertical.xxs,
    textTransform: 'capitalize',
  },
  resultDesc: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacingVertical.xxs,
  },
  unrated: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacingVertical.xxs,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacingVertical.xxl,
    paddingHorizontal: spacing.md,
  },
  initialState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacingVertical.xxl,
  },
  initialIcon: {
    fontSize: scale(40),
    marginBottom: spacingVertical.md,
  },
  initialText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
