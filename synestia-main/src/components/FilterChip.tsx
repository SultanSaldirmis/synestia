import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, radii, spacing, spacingVertical, typography } from '../theme';

export type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
    >
      <Text style={[styles.label, selected ? styles.labelSelected : styles.labelIdle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacingVertical.sm,
    borderRadius: radii.full,
    marginRight: spacing.sm,
    borderWidth: 1,
  },
  chipIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  label: {
    ...typography.meta,
  },
  labelIdle: {
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.textOnAccent,
    fontWeight: '700',
  },
});
