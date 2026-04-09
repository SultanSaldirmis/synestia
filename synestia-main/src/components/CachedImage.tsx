import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

type Props = {
  uri?: string | null;
  /** Yerel asset (ör. require(...)) */
  localSource?: number;
  style: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
  onError?: () => void;
  accessibilityLabel?: string;
};

export function CachedImage({
  uri,
  localSource,
  style,
  contentFit = 'cover',
  onError,
  accessibilityLabel,
}: Props) {
  if (localSource != null) {
    return (
      <Image
        source={localSource}
        style={style}
        contentFit={contentFit}
        cachePolicy="disk"
        onError={onError}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  const u = uri?.trim();
  if (!u) return null;
  return (
    <Image
      source={{ uri: u }}
      style={style}
      contentFit={contentFit}
      cachePolicy="disk"
      onError={onError}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
