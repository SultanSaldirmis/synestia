import { scale, verticalScale } from './pixelScale';

/** Yatay boşluklar, border-radius (genişlik referanslı) */
export const spacing = {
  xxs: scale(4),
  xs: scale(8),
  sm: scale(12),
  md: scale(16),
  lg: scale(20),
  xl: scale(24),
  xxl: scale(32),
} as const;

/** Dikey boşluklar */
export const spacingVertical = {
  xxs: verticalScale(4),
  xs: verticalScale(8),
  sm: verticalScale(12),
  md: verticalScale(16),
  lg: verticalScale(20),
  xl: verticalScale(24),
  xxl: verticalScale(32),
} as const;

/** Kart / buton köşeleri */
export const radii = {
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  full: scale(999),
} as const;
