export const MOMENTS_COLLECTION_CANONICAL_NAME = 'Anılar';

export const LEGACY_MOMENTS_COLLECTION_NAMES = ['Anılar', 'Moments'] as const;

export function isMomentsCollectionName(name: string): boolean {
  return LEGACY_MOMENTS_COLLECTION_NAMES.includes(name as (typeof LEGACY_MOMENTS_COLLECTION_NAMES)[number]);
}
