import * as ImageManipulator from 'expo-image-manipulator';

const SIZE = 300;

/** Seçilen görseli 300×300 JPEG (düşük sıkıştırma) ve data URL olarak üretir — Storage kullanılmaz. */
export async function encodeProfileImageForFirestore(localUri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: SIZE, height: SIZE } }],
    {
      compress: 0.3,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );
  if (!manipulated.base64) {
    throw new Error('Profil görseli Base64’e dönüştürülemedi.');
  }
  return `data:image/jpeg;base64,${manipulated.base64}`;
}
