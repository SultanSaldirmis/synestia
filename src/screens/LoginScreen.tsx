import { useState } from 'react';
import {
  Alert,
  Button,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import { colors, radii, scale, spacing, spacingVertical, typography, verticalScale } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const BG = require('../assets/synestia-background.png');

export function LoginScreen({ navigation }: Props) {
  const { signIn, firebaseConfigured, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!firebaseConfigured) {
      setError(
        'Servise şu anda bağlanılamıyor. Lütfen daha sonra tekrar deneyin.',
      );
      return;
    }
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Giriş başarısız.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onForgotPassword() {
    if (!firebaseConfigured) {
      Alert.alert('Uyarı', 'Şifre sıfırlama şu anda kullanılamıyor.');
      return;
    }
    const targetEmail = email.trim();
    if (!targetEmail) {
      Alert.alert('E-posta gerekli', 'Önce e-posta alanını doldurun.');
      return;
    }
    try {
      await resetPassword(targetEmail);
      Alert.alert('Başarılı', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Şifre sıfırlama gönderilemedi.');
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
          <Text style={styles.logo}>Synestia</Text>
          <Text style={styles.tagline}>Müzik · Film · Kitap — tek sosyal akış</Text>

          {!firebaseConfigured ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>
                Sunucu bağlantısı şu anda kullanılamıyor. Kısa süre sonra yeniden deneyin.
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          <View style={styles.nativeButtonWrap}>
            <Button title={busy ? 'Giriş Yapılıyor...' : 'Giriş Yap'} onPress={() => void onSubmit()} color="#A855F7" />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.linkWrap}
            activeOpacity={0.85}
          >
            <Text style={styles.link}>Hesabın yok mu? Kayıt ol</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void onForgotPassword()} style={styles.forgotWrap} activeOpacity={0.85}>
            <Text style={styles.forgot}>Şifremi Unuttum</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 18, 0.72)',
  },
  safe: {
    flex: 1,
    position: 'relative',
  },
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
  warnText: {
    ...typography.meta,
    color: colors.accentBlue,
  },
  error: {
    ...typography.meta,
    color: colors.danger,
    marginBottom: spacingVertical.sm,
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
  linkWrap: {
    marginTop: spacingVertical.lg,
    alignItems: 'center',
  },
  link: {
    ...typography.subtitle,
    color: colors.accentBlue,
  },
  forgotWrap: {
    marginTop: spacingVertical.sm,
    alignItems: 'center',
  },
  forgot: {
    ...typography.meta,
    color: colors.textMuted,
  },
  nativeButtonWrap: {
    marginTop: spacingVertical.sm,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
});
