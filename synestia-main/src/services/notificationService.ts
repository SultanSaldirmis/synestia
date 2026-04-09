import Constants from 'expo-constants';

export const isExpoGoRuntime = Constants.appOwnership === 'expo';

let warnedExpoGo = false;
let notificationsModule: typeof import('expo-notifications') | null = null;
let handlerRegistered = false;

function warnExpoGoOnce(): void {
  if (warnedExpoGo) return;
  warnedExpoGo = true;
  console.warn(
    '[Synestia] Expo Go: uzaktan push bildirimleri devre dışı. Geliştirme için development build kullanın: https://docs.expo.dev/develop/development-builds/introduction/',
  );
}

/**
 * Expo Go içinde expo-notifications yüklenmez; SDK 53+ push token kaydı LogBox hatasına yol açmaz.
 * Development / store build’de modül dinamik yüklenir ve handler ayarlanır.
 */
export async function initExpoNotifications(): Promise<void> {
  if (isExpoGoRuntime) {
    warnExpoGoOnce();
    return;
  }
  if (handlerRegistered) return;
  try {
    notificationsModule = await import('expo-notifications');
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerRegistered = true;
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermissions(): Promise<void> {
  if (isExpoGoRuntime) {
    warnExpoGoOnce();
    return;
  }
  const mod = notificationsModule ?? (await import('expo-notifications'));
  notificationsModule = mod;
  await mod.requestPermissionsAsync().catch(() => {});
}

/** getDevicePushTokenAsync Expo Go’da çağrılmaz. */
export async function scheduleLocalNotification(content: {
  title: string;
  body: string;
  sound?: boolean;
}): Promise<void> {
  if (isExpoGoRuntime) return;
  const mod = notificationsModule ?? (await import('expo-notifications'));
  notificationsModule = mod;
  await mod
    .scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: content.sound ?? true,
      },
      trigger: null,
    })
    .catch(() => {});
}
