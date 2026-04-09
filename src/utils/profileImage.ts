/**
 * Firestore `profileImageUrl`: tam `data:image/jpeg;base64,...` veya ham base64 veya eski https URL.
 */
export function profileImageDisplayUri(stored: string | undefined | null): string | undefined {
  if (!stored?.trim()) return undefined;
  const s = stored.trim();
  if (s.startsWith('data:')) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `data:image/jpeg;base64,${s}`;
}
