import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenSafeArea } from '../components';
import { useAuth } from '../context/AuthContext';
import type { AppStackParamList } from '../navigation/types';
import { encodeProfileImageForFirestore } from '../services/profileImageCodec';
import {
  getUserProfileOnce,
  syncAuthorProfileImageEverywhere,
  updateUserProfileData,
} from '../services/firestoreService';
import { profileImageDisplayUri } from '../utils/profileImage';
import { colors, radii, scale, spacing, spacingVertical, typography } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

const AVATAR = scale(96);

export function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, firebaseConfigured } = useAuth();
  const [bio, setBio] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [storedImage, setStoredImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid || !firebaseConfigured) return;
    void (async () => {
      const p = await getUserProfileOnce(user.uid);
      if (p?.bio !== undefined) setBio(p.bio ?? '');
      if (p?.profileImageUrl) setStoredImage(p.profileImageUrl);
    })();
  }, [firebaseConfigured, user?.uid]);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('editProfile.permissionTitle'), t('editProfile.galleryPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setLocalImageUri(result.assets[0].uri);
    }
  }, [t]);

  const save = useCallback(async () => {
    if (!user?.uid) {
      Alert.alert(t('common.error'), t('editProfile.loginRequired'));
      return;
    }
    if (!firebaseConfigured) {
      Alert.alert(t('common.error'), t('common.firebaseMissing'));
      return;
    }
    setSaving(true);
    try {
      let profileImageUrl: string | undefined;
      if (localImageUri) {
        profileImageUrl = await encodeProfileImageForFirestore(localImageUri);
        setStoredImage(profileImageUrl);
        setLocalImageUri(null);
      }
      await updateUserProfileData(user.uid, {
        bio: bio.trim(),
        ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
      });
      if (profileImageUrl !== undefined) {
        try {
          await syncAuthorProfileImageEverywhere(user.uid, profileImageUrl);
        } catch (syncErr) {
          console.error('[EditProfile] Profil resmi gönderi/yorum senkronu başarısız:', syncErr);
        }
      }
      navigation.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('editProfile.saveFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setSaving(false);
    }
  }, [bio, firebaseConfigured, localImageUri, navigation, user?.uid, t]);

  const previewUri = localImageUri ?? profileImageDisplayUri(storedImage ?? undefined);

  return (
    <ScreenSafeArea edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.headerLink}>{t('common.cancel')}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
        <Pressable
          onPress={() => void save()}
          disabled={saving}
          hitSlop={12}
          style={({ pressed }) => [pressed && styles.headerPressed]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.accentPurple} />
          ) : (
            <Text style={styles.headerDone}>{t('common.done')}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.avatarBlock}>
        <Pressable onPress={() => void pickImage()} style={styles.avatarPress}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>?</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => void pickImage()}>
          <Text style={styles.changePhoto}>{t('editProfile.changePhoto')}</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>{t('editProfile.about')}</Text>
      <TextInput
        style={styles.input}
        value={bio}
        onChangeText={setBio}
        placeholder={t('editProfile.bioPlaceholder')}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={280}
        textAlignVertical="top"
      />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacingVertical.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingVertical.lg,
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  headerLink: {
    ...typography.body,
    color: colors.textSecondary,
  },
  headerDone: {
    ...typography.button,
    color: colors.accentPurple,
  },
  headerPressed: { opacity: 0.7 },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: spacingVertical.xl,
  },
  avatarPress: { marginBottom: spacingVertical.sm },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.surfaceElevated,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarPlaceholderText: {
    fontSize: scale(32),
    color: colors.textMuted,
  },
  changePhoto: {
    ...typography.button,
    color: colors.accentLavender,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacingVertical.xs,
    textTransform: 'uppercase',
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: scale(120),
  },
});
