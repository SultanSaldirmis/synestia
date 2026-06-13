import type { TFunction } from 'i18next';

const MOMENT_DEFAULT_CAPTIONS = [
  'Bir anı paylaştı.',
  'Bir anı paylaştı',
  'Shared a moment.',
  'Shared a moment',
];
const LOCATION_SHARE_CAPTIONS = [
  'Konum paylaşımı',
  'Konum paylaşımı.',
  'Location share',
  'Location share.',
];

function isMomentDefaultCaption(text: string): boolean {
  return MOMENT_DEFAULT_CAPTIONS.includes(text);
}

function isLocationShareCaption(text: string): boolean {
  return LOCATION_SHARE_CAPTIONS.includes(text);
}

export function localizeMomentExcerpt(excerpt: string | undefined, t: TFunction): string {
  const trimmed = excerpt?.trim() ?? '';
  if (!trimmed) return trimmed;
  if (isLocationShareCaption(trimmed)) {
    return t('camera.locationShareDefault');
  }
  if (isMomentDefaultCaption(trimmed)) {
    return t('camera.momentDefaultCaption');
  }
  return trimmed;
}
