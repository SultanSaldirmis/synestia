import type { TFunction } from 'i18next';
import type { CollectionThemeType } from '../services/firestoreService';

export function getCollectionTypeLabel(t: TFunction, type: CollectionThemeType): string {
  return t(`collectionType.${type}`);
}
