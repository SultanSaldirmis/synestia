import { useState } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import { colors, radii, spacing, spacingVertical, typography } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const BG = require('../assets/background.png');

export function RegisterScreen({ navigation }: Props) {
  const { signUp, firebaseConfigured } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!firebaseConfigured) {
      setError('Önce Firebase .env değişkenlerini doldurun.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setError('Geçerli e-posta ve en az 6 karakter şifre gerekli.');
      return;
    }
    setBusy(true);
    try {
      await signUp(email, password, displayName);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Kayıt başarısız.';
      setError(msg);
    } finally {
      setBusy(false);
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
            <Text style={styles.title}>Hesap oluştur</Text>
            <Text style={styles.subtitle}>
              Synestia topluluğuna katılmak için bilgilerini doldur.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Görünen ad</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>E-posta</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="ornek@edu.tr"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Şifre</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="En az 6 karakter"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />

            <Pressable
              onPress={onSubmit}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtn,
                (pressed || busy) && styles.primaryBtnDim,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <Text style={styles.primaryBtnText}>Kayıt ol</Text>
              )}
            </Pressable>

            <Pressable onPress={() => navigation.goBack()} style={styles.secondary}>
              <Text style={styles.secondaryText}>Girişe dön</Text>
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
  error: {
    ...typography.meta,
    color: colors.danger,
    marginBottom: spacingVertical.md,
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
    marginBottom: spacingVertical.md,
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
