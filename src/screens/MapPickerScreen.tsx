import { useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing, spacingVertical, typography, radii, scale } from '../theme';

// Gümüşhane Üniversitesi Mühendislik ve Doğa Bilimleri Fakültesi
const FACULTY_REGION: Region = {
  latitude: 40.4567,
  longitude: 39.5,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

type Props = NativeStackScreenProps<AppStackParamList, 'MapPicker'>;

export function MapPickerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<{ latitude: number; longitude: number } | null>(
    route.params?.initialCoords ?? null,
  );

  const onMapPress = useCallback((e: MapPressEvent) => {
    setSelected(e.nativeEvent.coordinate);
  }, []);

  function onConfirm() {
    if (!selected) return;
    route.params?.onConfirm?.(selected.latitude, selected.longitude);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scale(22)} color={colors.accentPurple} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('map.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <Text style={styles.hint}>{t('map.hint')}</Text>

      <MapView
        style={[styles.map, { width }]}
        initialRegion={FACULTY_REGION}
        onPress={onMapPress}
      >
        {selected && (
          <Marker coordinate={selected} pinColor={colors.accentPurple} />
        )}
      </MapView>

      <View style={styles.footer}>
        {selected ? (
          <Text style={styles.coords}>
            {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.coordsEmpty}>{t('map.hint')}</Text>
        )}
        <TouchableOpacity
          style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
          onPress={onConfirm}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={scale(20)} color={colors.textOnAccent} />
          <Text style={styles.confirmBtnText}>{t('map.confirm')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: scale(40),
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  hint: {
    ...typography.meta,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacingVertical.xs,
    paddingHorizontal: spacing.lg,
  },
  map: {
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    gap: spacingVertical.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  coords: {
    ...typography.meta,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  coordsEmpty: {
    ...typography.meta,
    color: colors.textMuted,
    textAlign: 'center',
  },
  confirmBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accentPurple,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    ...typography.button,
    color: colors.textOnAccent,
  },
});
