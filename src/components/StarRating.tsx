import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, scale, spacing, typography } from '../theme';

type Props = {
  rating: number;
  totalRatings?: number;
  size?: number;
  onRate?: (value: number) => void;
};

export function StarRating({ rating, totalRatings, size = scale(14), onRate }: Props) {
  const rounded = Math.max(0, Math.min(5, rating));
  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }).map((_, idx) => {
        const val = idx + 1;
        const filled = rounded >= val - 0.25;
        return (
          <Pressable
            key={val}
            onPress={() => onRate?.(val)}
            disabled={!onRate}
            hitSlop={6}
            style={styles.hit}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? colors.accentPurple : colors.textMuted}
            />
          </Pressable>
        );
      })}
      <Text style={styles.meta}>
        {rounded > 0 ? rounded.toFixed(1) : '0.0'}
        {typeof totalRatings === 'number' ? ` (${totalRatings})` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  hit: { padding: 1 },
  meta: { ...typography.meta, color: colors.textMuted, marginLeft: spacing.xs },
});

