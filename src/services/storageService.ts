import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseApp } from './firebaseApp';

/**
 * Yerel dosya URI'sini Firebase Storage'a yükler ve download URL döner.
 * path: moments/{uid}/{timestamp}.jpg
 */
export async function uploadMomentPhoto(uid: string, localUri: string): Promise<string> {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı.');

  // Bucket adını gs:// formatıyla explicit belirt — yeni .firebasestorage.app domain'i için gerekli
  const storage = getStorage(app, 'gs://synestia-ddf6a.firebasestorage.app');
  const path = `moments/${uid}/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);

  // XMLHttpRequest kullan — Expo'da fetch().blob() bazen hatalı blob üretir
  const blob: Blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('Fotoğraf dosyası okunamadı'));
    xhr.responseType = 'blob';
    xhr.open('GET', localUri, true);
    xhr.send(null);
  });

  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
