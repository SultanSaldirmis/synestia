import type { TFunction } from 'i18next';
import { isMomentsCollectionName } from '../constants/momentsCollection';

export function getCollectionDisplayName(name: string, t: TFunction): string {
  if (isMomentsCollectionName(name)) {
    return t('collection.momentsDefaultName');
  }
  return name;
}
