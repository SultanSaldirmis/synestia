import { useEffect, useState } from 'react';
import { subscribeUserProfile } from '../services/firestoreService';

/** Yorum yazarları için güncel profil fotoğrafı URL'lerini canlı dinler. */
export function useAuthorAvatarMap(authorUids: readonly string[]): Record<string, string | undefined> {
  const [map, setMap] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    const unique = [...new Set(authorUids.filter(Boolean))];
    if (unique.length === 0) {
      setMap({});
      return;
    }

    const unsubs = unique.map((uid) =>
      subscribeUserProfile(uid, (profile) => {
        const url = profile?.profileImageUrl?.trim() || undefined;
        setMap((prev) => ({ ...prev, [uid]: url }));
      }),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [authorUids.slice().sort().join('\0')]);

  return map;
}
