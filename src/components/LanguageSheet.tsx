/**
 * LanguageSheet — saf React Native Modal ile dil seçimi.
 * react-native-actions-sheet / react-native-reanimated bağımlılığı yoktur;
 * Expo Go ile tam uyumludur.
 */
import { useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../store/hooks';
import { setLanguage } from '../store/uiSlice';
import { colors, spacing, spacingVertical, typography, radii } from '../theme';

export function LanguageSheet() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const [visible, setVisible] = useState(false);

  const current = i18n.language;

  function open() {
    setVisible(true);
  }

  async function select(lang: 'tr' | 'en') {
    dispatch(setLanguage(lang));
    await i18n.changeLanguage(lang);
    dayjs.locale(lang === 'en' ? 'en' : 'tr');
    setVisible(false);
  }

  return (
    <>
      {/* Trigger button — aynı görünüm */}
      <TouchableOpacity style={styles.trigger} onPress={open} activeOpacity={0.8}>
        <Ionicons name="language-outline" size={20} color={colors.accentPurple} />
        <Text style={styles.triggerText}>{t('settings.language')}</Text>
        <Text style={styles.currentLang}>{current === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Bottom-sheet modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        {/* Dim overlay */}
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* Sheet panel */}
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          <Text style={styles.sheetTitle}>{t('settings.selectLanguage')}</Text>

          <TouchableOpacity
            style={[styles.option, current === 'tr' && styles.optionActive]}
            onPress={() => void select('tr')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionFlag}>🇹🇷</Text>
            <Text style={styles.optionText}>{t('settings.turkish')}</Text>
            {current === 'tr' && (
              <Ionicons name="checkmark-circle" size={20} color={colors.accentPurple} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, current === 'en' && styles.optionActive]}
            onPress={() => void select('en')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionFlag}>🇬🇧</Text>
            <Text style={styles.optionText}>{t('settings.english')}</Text>
            {current === 'en' && (
              <Ionicons name="checkmark-circle" size={20} color={colors.accentPurple} />
            )}
          </TouchableOpacity>

          <View style={styles.spacer} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  triggerText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  currentLang: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacingVertical.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacingVertical.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
    marginBottom: spacingVertical.sm,
  },
  optionActive: {
    backgroundColor: colors.surfaceElevated,
  },
  optionFlag: {
    fontSize: 24,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  spacer: {
    height: spacingVertical.md,
  },
});
