import type { PostCategory } from '../components';

/** Gönderiye bağlı kitap / film / şarkı (Firestore `attachedContent`). */
export type AttachedContent = {
  type: 'song' | 'movie' | 'book';
  id: string;
  title: string;
  artistName?: string;
  imageUrl: string;
  externalUrl: string;
  previewUrl?: string;
};

/** Ana sayfa sosyal akış gönderileri (mock). */
export type FeedPost = {
  id: string;
  title: string;
  imageUrl: string;
  authorName: string;
  category: PostCategory;
  excerpt: string;
  authorUid?: string;
  authorIsPrivate?: boolean;
  commentCount?: number;
  authorProfileImageUrl?: string;
  /** Firestore `createdAt` → ms */
  createdAtMs?: number;
  /** Firestore henüz yazılmadan önce istemci fallback zamanı */
  createdAtClientMs?: number;
  likesCount?: number;
  rating?: number;
  attachedContent?: AttachedContent;
};

/** Keşfet kataloğu — detaya giderken tam metin için body. */
export type CatalogItem = {
  id: string;
  title: string;
  category: PostCategory;
  description: string;
  imageUrl: string;
  body: string;
};

export const MOCK_FEED: FeedPost[] = [
  {
    id: 'f1',
    title: 'Dune: Part Two',
    imageUrl: 'https://picsum.photos/seed/dune/800/480',
    authorName: '@filmkulubu',
    category: 'movie',
    excerpt: 'Çöl gezegeni destanı devam ediyor.',
  },
  {
    id: 'f2',
    title: 'Random Access Memories',
    imageUrl: 'https://picsum.photos/seed/ram/800/480',
    authorName: '@geceplaylist',
    category: 'music',
    excerpt: 'Daft Punk klasiği — paylaşım.',
  },
  {
    id: 'f3',
    title: 'Suç ve Ceza',
    imageUrl: 'https://picsum.photos/seed/dost/800/480',
    authorName: '@kitapkurdu',
    category: 'book',
    excerpt: 'Raskolnikov’un iç dünyası.',
  },
  {
    id: 'f4',
    title: 'Interstellar',
    imageUrl: 'https://picsum.photos/seed/inter/800/480',
    authorName: '@sinemadokusu',
    category: 'movie',
    excerpt: 'Zaman, aşk ve yerçekimi.',
  },
  {
    id: 'f5',
    title: 'The Dark Side of the Moon',
    imageUrl: 'https://picsum.photos/seed/pink/800/480',
    authorName: '@progrock',
    category: 'music',
    excerpt: 'Pink Floyd’un ses laboratuvarı.',
  },
];

export const MOCK_CATALOG: CatalogItem[] = [
  {
    id: 'c1',
    title: 'Blade Runner 2049',
    category: 'movie',
    description: 'Neo-noir bilimkurgu, görsel şiir.',
    imageUrl: 'https://picsum.photos/seed/br2049/400/300',
    body:
      'Denis Villeneuve imzalı devam filmi, özgün Blade Runner evrenini genişleterek kimlik, hafıza ve yapay yaşam sorularını yeniden gündeme getirir. Görsellik ve ses tasarımı ders notları için güçlü bir referans.',
  },
  {
    id: 'c2',
    title: '1984',
    category: 'book',
    description: 'George Orwell — distopya klasiği.',
    imageUrl: 'https://picsum.photos/seed/1984/400/300',
    body:
      'Büyük Birader, çift düşün ve gerçeğin devlet eliyle yeniden yazılması üzerine kurulu bu roman, günümüzde veri gizliliği ve gözetim tartışmaları için de güçlü bir çerçeve sunar.',
  },
  {
    id: 'c3',
    title: 'Kid A',
    category: 'music',
    description: 'Radiohead — elektronik dönüşüm.',
    imageUrl: 'https://picsum.photos/seed/kida/400/300',
    body:
      'Radiohead’in dönüm noktası sayılan albümü, rock formunu parçalayarak ambient ve elektronik dokunuşlarla yeniden inşa eder. Ders için “tür sınırlarını aşmak” örneği.',
  },
];

export type ProfileBook = { id: string; title: string; author: string };
export type ProfileSong = { id: string; title: string; artist: string };

export const MOCK_USER = {
  displayName: 'Sultan SALDIRMIŞ',
  handle: '@sulta',
  bio: 'Film, kitap ve müzik üçlüsünü tek akışta takip ediyorum.',
};

export const MOCK_BOOKS_READ: ProfileBook[] = [
  { id: 'b1', title: 'Sefiller', author: 'Victor Hugo' },
  { id: 'b2', title: 'Yerdeniz Büyücüsü', author: 'Ursula K. Le Guin' },
  { id: 'b3', title: 'Dune', author: 'Frank Herbert' },
];

export const MOCK_LIKED_SONGS: ProfileSong[] = [
  { id: 's1', title: 'Midnight City', artist: 'M83' },
  { id: 's2', title: 'Strobe', artist: 'deadmau5' },
  { id: 's3', title: 'Everything In Its Right Place', artist: 'Radiohead' },
];
