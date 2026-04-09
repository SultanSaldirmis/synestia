import {
  scale as sizeMattersScale,
  verticalScale as sizeMattersVerticalScale,
} from 'react-native-size-matters';

/**
 * Fabric (Yeni Mimari) bazı stil özelliklerinde kesirli piksel kabul etmez.
 * scale / verticalScale çıktıları tamsayıya yuvarlanır.
 */
export function scale(size: number): number {
  return Math.round(sizeMattersScale(size));
}

export function verticalScale(size: number): number {
  return Math.round(sizeMattersVerticalScale(size));
}

/** layoutWidth * 0.06 gibi ifadeler için */
export function roundLayout(n: number): number {
  return Math.round(n);
}
