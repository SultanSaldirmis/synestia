import { Alert, Linking, Platform } from 'react-native';

function buildMapUrl(latitude: number, longitude: number, label?: string): string {
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  const safeLabel = encodeURIComponent(label?.trim() || 'Location');

  if (Platform.OS === 'android') {
    return `geo:0,0?q=${lat},${lng}(${safeLabel})`;
  }
  if (Platform.OS === 'ios') {
    return `maps:0,0?q=${safeLabel}@${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function buildFallbackUrl(latitude: number, longitude: number): string {
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export async function openExternalMap(
  latitude: number,
  longitude: number,
  label?: string,
  errorMessage = 'Harita uygulaması açılamadı.',
): Promise<void> {
  const primary = buildMapUrl(latitude, longitude, label);
  try {
    const canOpen = await Linking.canOpenURL(primary);
    if (canOpen) {
      await Linking.openURL(primary);
      return;
    }
  } catch {
    // try fallback below
  }

  const fallback = buildFallbackUrl(latitude, longitude);
  try {
    await Linking.openURL(fallback);
  } catch {
    Alert.alert(errorMessage);
  }
}
