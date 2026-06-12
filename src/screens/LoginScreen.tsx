import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { showMessage } from 'react-native-flash-message';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import { colors, radii, scale, spacing, spacingVertical, typography, verticalScale } from '../theme';
import { loginSchema, type LoginFormValues } from '../validation/authSchemas';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const BG = require('../assets/synestia_background.png');

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { signIn, firebaseConfigured, resetPassword } = useAuth();

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginFormValues) {
    if (!firebaseConfigured) {
      showMessage({ message: t('auth.serverUnavailable'), type: 'warning' });
      return;
    }
    try {
      await signIn(data.email, data.password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Giriş başarısız.';
      showMessage({ message: msg, type: 'danger' });
    }
  }

  async function onForgotPassword() {
    if (!firebaseConfigured) {
      Alert.alert(t('common.error'), t('auth.serverUnavailable'));
      return;
    }
    const email = getValues('email').trim();
    if (!email) {
      showMessage({ message: t('auth.resetEmailRequired'), type: 'warning' });
      return;
    }
    try {
      await resetPassword(email);
      showMessage({ message: t('auth.resetSent'), type: 'success' });
    } catch (e) {
      showMessage({ message: e instanceof Error ? e.message : 'Hata', type: 'danger' });
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
          <Text style={styles.logo}>{t('common.appName')}</Text>
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>

          {!firebaseConfigured && (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>{t('auth.serverUnavailable')}</Text>
            </View>
          )}

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
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            )}
          />
          {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

          <View style={styles.submitBtn}>
            <TouchableOpacity
              onPress={() => void handleSubmit(onSubmit)()}
              disabled={isSubmitting}
              style={[styles.btn, isSubmitting && styles.btnDisabled]}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <Text style={styles.btnText}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.linkWrap}
            activeOpacity={0.85}
          >
            <Text style={styles.link}>{t('auth.noAccount')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void onForgotPassword()}
            style={styles.forgotWrap}
            activeOpacity={0.85}
          >
            <Text style={styles.forgot}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>
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
  safe: { flex: 1, position: 'relative' },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  logo: {
    ...typography.display,
    color: colors.accentGreen,
    marginBottom: spacingVertical.sm,
    textAlign: 'center',
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacingVertical.xl,
    textAlign: 'center',
  },
  warnBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: colors.accentBlue,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacingVertical.md,
  },
  warnText: { ...typography.meta, color: colors.accentBlue },
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
    marginBottom: verticalScale(2),
  },
  inputError: { borderColor: colors.danger },
  fieldError: {
    ...typography.meta,
    color: colors.danger,
    marginBottom: spacingVertical.sm,
  },
  submitBtn: { marginTop: spacingVertical.sm },
  btn: {
    backgroundColor: colors.accentPurple,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.md,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    ...typography.button,
    color: colors.textOnAccent,
  },
  linkWrap: { marginTop: spacingVertical.lg, alignItems: 'center' },
  link: { ...typography.subtitle, color: colors.accentBlue },
  forgotWrap: { marginTop: spacingVertical.sm, alignItems: 'center' },
  forgot: { ...typography.meta, color: colors.textMuted },
});
