/** Keşfet birleşik arama satırı (API + Firestore kullanıcıları). */
export type SearchResultType = 'movie' | 'music' | 'book' | 'user';

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  /** Uzak URL; boşsa `assets/no-image` yerel görseli kullanılır. */
  imageUrl: string;
  type: SearchResultType;
  /** type === 'user' iken profil ekranına gider. */
  userUid?: string;
  /** Ham profil görseli (base64/https); yalnızca kullanıcı satırlarında. */
  profileImageStored?: string;
  /** Spotify preview mp3 URL (music). */
  previewUrl?: string;
  /** Dış link (özellikle Spotify track). */
  externalUrl?: string;
  /** Kitap puan ortalaması (varsa). */
  averageRating?: number;
  totalRatings?: number;
};
