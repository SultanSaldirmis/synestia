import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenSafeArea } from '../components';
import { useAuth } from '../context/AuthContext';
import type { AppStackParamList } from '../navigation/types';
import {
  subscribeFollowUsernames,
  subscribeUserCollections,
  type FollowListRow,
  type UserCollectionDoc,
} from '../services/firestoreService';
import { profileImageDisplayUri } from '../utils/profileImage';
import { colors, radii, scale, spacing, spacingVertical, typography } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'FollowList'>;

const edges = ['top', 'left', 'right', 'bottom'] as const;

type Row = { key: string; label: string; avatarUri?: string };

export function FollowListScreen({ route }: Props) {
  const { t } = useTranslation();
  const { mode, userId: routeUserId } = route.params;
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const targetUid = routeUserId ?? user?.uid ?? '';
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!targetUid) {
      setRows([]);
      return;
    }
    if (mode === 'collections') {
      return subscribeUserCollections(targetUid, (items: UserCollectionDoc[]) => {
        setRows(items.map((c) => ({ key: c.id, label: c.name })));
      });
    }
    return subscribeFollowUsernames(targetUid, mode === 'followers' ? 'followers' : 'following', (list: FollowListRow[]) => {
      setRows(
        list.map((x) => ({
          key: x.uid,
          label: x.label,
          avatarUri: profileImageDisplayUri(x.profileImageUrl),
        })),
      );
    });
  }, [mode, targetUid]);

  const onRowPress = (item: Row) => {
    if (mode === 'collections') return;
    navigation.navigate('UserProfile', { userId: item.key });
  };

  return (
    <ScreenSafeArea edges={edges}>
      <View style={styles.wrap}>
        {!targetUid ? (
          <Text style={styles.hint}>{t('follow.sessionOrUserRequired')}</Text>
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onRowPress(item)}
              disabled={mode === 'collections'}
              style={({ pressed }) => [styles.row, pressed && mode !== 'collections' && styles.rowPressed]}
            >
              {mode === 'collections' ? null : (
                <View style={styles.avatarWrap}>
                  {item.avatarUri ? (
                    <Image source={{ uri: item.avatarUri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>{item.label.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={styles.rowText} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {mode === 'collections' ? t('profile.noCollections') : t('follow.emptyList')}
            </Text>
          }
          contentContainerStyle={styles.list}
        />
      </View>
    </ScreenSafeArea>
  );
}

const AV = scale(48);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacingVertical.md,
  },
  hint: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacingVertical.md,
  },
  list: {
    paddingBottom: spacingVertical.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacingVertical.sm,
  },
  rowPressed: { opacity: 0.88 },
  avatarWrap: {},
  avatar: {
    width: AV,
    height: AV,
    borderRadius: AV / 2,
    backgroundColor: colors.surfaceElevated,
  },
  avatarFallback: {
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: scale(18), fontWeight: '700', color: colors.accentPurple },
  rowText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacingVertical.xl,
  },
});
