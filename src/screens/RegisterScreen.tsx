import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { showMessage } from 'react-native-flash-message';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import { colors, radii, spacing, spacingVertical, typography } from '../theme';
import { registerSchema, type RegisterFormValues } from '../validation/authSchemas';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const BG = require('../assets/synestia_background.png');

export function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { signUp, firebaseConfigured } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', passwordConfirm: '' },
  });

  async function onSubmit(data: RegisterFormValues) {
    if (!firebaseConfigured) {
      showMessage({ message: 'Önce Firebase yapılandırmasını tamamlayın.', type: 'warning' });
      return;
    }
    try {
      await signUp(data.email, data.password, data.displayName);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Kayıt başarısız.';
      showMessage({ message: msg, type: 'danger' });
    }
  }

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover" blurRadius={2}>
      <View style={styles.dim} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{t('auth.createAccount')}</Text>
            <Text style={styles.subtitle}>{t('auth.joinCommunity')}</Text>

            <Text style={styles.label}>{t('auth.displayName')}</Text>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={[styles.input, errors.displayName && styles.inputError]}
                  placeholder={t('auth.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                />
              )}
            />
            {errors.displayName && <Text style={styles.fieldError}>{errors.displayName.message}</Text>}

            <Text style={styles.label}>{t('auth.email')}</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}
            />
            {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}

            <Text style={styles.label}>{t('auth.password')}</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                />
              )}
            />
            {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

            <Text style={styles.label}>Şifre Tekrar</Text>
            <Controller
              control={control}
              name="passwordConfirm"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={[styles.input, errors.passwordConfirm && styles.inputError]}
                  placeholder="Şifreyi tekrar giriniz"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                />
              )}
            />
            {errors.passwordConfirm && (
              <Text style={styles.fieldError}>{errors.passwordConfirm.message}</Text>
            )}

            <Pressable
              onPress={() => void handleSubmit(onSubmit)()}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.primaryBtn,
                (pressed || isSubmitting) && styles.primaryBtnDim,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('auth.register')}</Text>
              )}
            </Pressable>

            <Pressable onPress={() => navigation.goBack()} style={styles.secondary}>
              <Text style={styles.secondaryText}>{t('auth.hasAccount')}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 18, 0.72)',
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacingVertical.lg,
  },
  title: {
    ...typography.screenTitle,
    color: colors.accentGreen,
    marginBottom: spacingVertical.xs,
  },
  subtitle: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacingVertical.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacingVertical.xxs,
    textTransform: 'uppercase',
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.sm,
    marginBottom: 2,
  },
  inputError: { borderColor: colors.danger },
  fieldError: {
    ...typography.meta,
    color: colors.danger,
    marginBottom: spacingVertical.sm,
  },
  primaryBtn: {
    backgroundColor: colors.accentGreen,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.md,
    alignItems: 'center',
    marginTop: spacingVertical.sm,
  },
  primaryBtnDim: { opacity: 0.88 },
  primaryBtnText: {
    ...typography.button,
    color: colors.textOnAccent,
  },
  secondary: {
    marginTop: spacingVertical.lg,
    alignItems: 'center',
    padding: spacing.sm,
  },
  secondaryText: {
    ...typography.subtitle,
    color: colors.accentBlue,
  },
});
