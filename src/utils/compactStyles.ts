import type { ViewStyle } from 'react-native';

/** Pressable / View style dizilerinde `false` yerine TS-dostu dizi (strict mod). */
export function compactViewStyles(
  ...styles: (ViewStyle | undefined | null | false)[]
): ViewStyle[] {
  return styles.filter((s): s is ViewStyle => s != null && s !== false);
}
