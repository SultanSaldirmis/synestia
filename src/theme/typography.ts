import { scale, verticalScale } from './pixelScale';

/** Uygulamada kullanılan özel fontlar */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'SpaceMono_400Regular',
} as const;

/** Yatay / genişlikle ilişkili punto ölçekleri */
export const fontSize = {
  xs: scale(11),
  sm: scale(13),
  md: scale(15),
  lg: scale(18),
  xl: scale(22),
  xxl: scale(24),
  display: scale(28),
} as const;

/** Satır yükseklikleri — dikey ölçek */
export const lineHeight = {
  xs: verticalScale(14),
  sm: verticalScale(18),
  md: verticalScale(20),
  relaxed: verticalScale(22),
  loose: verticalScale(28),
  title: verticalScale(30),
} as const;

export const typography = {
  display: {
    fontSize: fontSize.display,
    lineHeight: lineHeight.title,
    fontWeight: '700' as const,
    fontFamily: fonts.bold,
  },
  screenTitle: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.loose,
    fontWeight: '700' as const,
    fontFamily: fonts.bold,
  },
  detailTitle: {
    fontSize: fontSize.xxl,
    lineHeight: lineHeight.title,
    fontWeight: '700' as const,
    fontFamily: fonts.bold,
  },
  subtitle: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.relaxed,
    fontWeight: '600' as const,
    fontFamily: fonts.semiBold,
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.relaxed,
    fontWeight: '400' as const,
    fontFamily: fonts.regular,
  },
  meta: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.md,
    fontWeight: '500' as const,
    fontFamily: fonts.medium,
  },
  caption: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    fontWeight: '600' as const,
    fontFamily: fonts.semiBold,
    letterSpacing: scale(1),
  },
  button: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600' as const,
    fontFamily: fonts.semiBold,
  },
  mono: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.md,
    fontFamily: fonts.mono,
  },
} as const;
