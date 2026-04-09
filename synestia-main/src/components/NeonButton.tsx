import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radii, spacing, spacingVertical, typography } from '../theme';
import { compactViewStyles } from '../utils/compactStyles';

export type NeonButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'fill' | 'outline';
  disabled?: boolean;
};

export function NeonButton({ label, onPress, variant = 'outline', disabled = false }: NeonButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) =>
        compactViewStyles(
          styles.base,
          variant === 'fill' ? styles.fill : styles.outline,
          disabled ? styles.disabled : undefined,
          pressed && !disabled ? styles.pressed : undefined,
        )
      }
    >
      <Text style={[styles.label, variant === 'fill' ? styles.labelOnFill : styles.labelOutline]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacingVertical.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  } satisfies ViewStyle,
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.accentGreen,
  } satisfies ViewStyle,
  fill: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  } satisfies ViewStyle,
  disabled: {
    opacity: 0.45,
  } satisfies ViewStyle,
  pressed: {
    opacity: 0.88,
  } satisfies ViewStyle,
  label: {
    ...typography.button,
    textAlign: 'center',
  },
  labelOutline: {
    color: colors.accentGreen,
  },
  labelOnFill: {
    color: colors.textOnAccent,
  },
});
