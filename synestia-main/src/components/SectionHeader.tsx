import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontSize, lineHeight, spacing, spacingVertical, typography } from '../theme';

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, subtitle, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} hitSlop={12} activeOpacity={0.8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacingVertical.md,
    paddingHorizontal: spacing.xxs,
  },
  textBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.loose,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacingVertical.xxs,
  },
  action: {
    ...typography.button,
    color: colors.accentBlue,
  },
});
