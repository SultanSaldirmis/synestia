import { Pressable, Platform, StyleSheet, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radii, scale, spacing, spacingVertical } from '../theme';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Ara…',
  onSubmitEditing,
}: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons
        name="search"
        size={scale(20)}
        color={colors.textMuted}
        style={styles.icon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={scale(20)} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: scale(44),
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.xs,
  } satisfies ViewStyle,
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '400',
    color: colors.textPrimary,
    ...(Platform.OS === 'android'
      ? {
          lineHeight: fontSize.md,
          paddingVertical: 0,
          textAlignVertical: 'center' as const,
          includeFontPadding: false,
        }
      : {
          height: scale(36),
          paddingVertical: spacingVertical.xs,
        }),
  } satisfies TextStyle,
  clearBtn: {
    marginLeft: spacing.sm,
  },
});
