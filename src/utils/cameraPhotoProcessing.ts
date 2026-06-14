import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 800;

/** Kamera fotoğrafını güvenli şekilde yeniden boyutlandırır; gerekirse merkez kare crop uygular. */
export async function processCameraPhoto(uri: string): Promise<string> {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );

  const w = resized.width ?? MAX_WIDTH;
  const h = resized.height ?? MAX_WIDTH;
  const side = Math.min(w, h);

  if (side <= 0 || (w === side && h === side)) {
    return resized.uri;
  }

  const originX = Math.floor((w - side) / 2);
  const originY = Math.floor((h - side) / 2);

  const cropped = await ImageManipulator.manipulateAsync(
    resized.uri,
    [{ crop: { originX, originY, width: side, height: side } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );

  return cropped.uri;
}
