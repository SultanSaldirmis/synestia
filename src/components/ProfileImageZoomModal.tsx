import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, scale, spacing, spacingVertical, typography } from '../theme';

type Props = {
  visible: boolean;
  imageUri?: string;
  onClose: () => void;
  variant?: 'avatar' | 'content';
};

export function ProfileImageZoomModal({
  visible,
  imageUri,
  onClose,
  variant = 'avatar',
}: Props) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isContent = variant === 'content';
  const imageStyle = isContent
    ? { width: width * 0.92, height: height * 0.72, maxWidth: '100%' as const }
    : styles.imageAvatar;

  if (!imageUri) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={styles.center} pointerEvents="box-none">
          <Image
            source={{ uri: imageUri }}
            style={imageStyle}
            contentFit="contain"
            cachePolicy="disk"
          />
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  center: {
    alignItems: 'center',
    gap: spacingVertical.lg,
  },
  imageAvatar: {
    width: scale(320),
    height: scale(320),
    maxWidth: '100%',
    borderRadius: scale(8),
  },
  closeBtn: {
    paddingVertical: spacingVertical.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: scale(12),
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeText: {
    ...typography.button,
    color: colors.textPrimary,
  },
});
