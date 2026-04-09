/**
 * Mor / lavanta / pembe tema (V3). Referans: renk paleti görseli.
 * `accentGreen` / `accentBlue` isimleri geriye uyumluluk için mor tonlarına eşlenir.
 */
export const colors = {
  background: '#1e1a28',
  surface: '#2a2438',
  surfaceElevated: '#332b45',
  border: '#443d5a',
  borderStrong: '#5a5270',

  textPrimary: '#faf5ff',
  textSecondary: '#c4b5fd',
  textMuted: '#948bb0',
  /** Açık vurgu (tabActive, lavanta buton) üzerindeki yazı */
  textOnAccent: '#1a1024',
  /** Aktif segment sekmesi (açık mor zemin) üzerindeki yazı */
  tabSegmentTextActive: '#000000',

  accentPurple: '#c084fc',
  accentPurpleMuted: '#a855f7',
  accentLavender: '#e9d5ff',
  accentPurpleDeep: '#9333ea',

  profileAccent: '#d946ef',

  tabActive: '#f0abfc',
  tabInactive: '#7c7394',
  tabBarBg: '#261f33',

  notification: '#c084fc',
  danger: '#f472b6',
  /** Gönderi / yorum thread çizgisi (X tarzı) */
  threadLine: '#c084fc',

  /** @deprecated V2 adı — kullanım `accentPurple` ile aynı */
  accentGreen: '#c084fc',
  /** @deprecated — `accentPurpleMuted` */
  accentGreenMuted: '#a855f7',
  /** @deprecated — `accentLavender` */
  accentBlue: '#e9d5ff',
  /** @deprecated — `accentPurpleDeep` */
  accentBlueDeep: '#9333ea',
} as const;

export type ColorName = keyof typeof colors;
