import type { FeedPost } from '../data/mockData';
import type { CollectionSavedItemPayload } from '../services/firestoreService';

export function buildBookmarkPayloadFromPost(item: FeedPost): CollectionSavedItemPayload | null {
  if (item.attachedContent) {
    const t = item.attachedContent.type;
    return {
      postId: item.id,
      contentType: t === 'song' ? 'music' : t,
      title: item.attachedContent.title,
      imageUrl: item.attachedContent.imageUrl || '',
      externalUrl: item.attachedContent.externalUrl?.trim() || undefined,
    };
  }
  const cat = item.category;
  if (cat === 'music' || cat === 'movie' || cat === 'book') {
    return {
      postId: item.id,
      contentType: cat,
      title: (item.title || item.excerpt || 'Gönderi').slice(0, 200),
      imageUrl: item.imageUrl || '',
    };
  }
  return null;
}
