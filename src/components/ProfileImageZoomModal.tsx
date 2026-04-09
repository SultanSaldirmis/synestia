import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, scale, spacing, spacingVertical, typography } from '../theme';

type Props = {
  visible: boolean;
  imageUri?: string;
  onClose: () => void;
};

export function ProfileImageZoomModal({ visible, imageUri, onClose }: Props) {
  if (!imageUri) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={styles.center} pointerEvents="box-none">
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="contain"
            cachePolicy="disk"
          />
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Kapat</Text>
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
  image: {
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
