import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ScreenSafeArea } from '../components';
import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  acceptFollowRequest,
  deleteNotification,
  markNotificationsRead,
  rejectFollowRequest,
  subscribeNotifications,
  type NotificationDoc,
} from '../services/firestoreService';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, spacingVertical, typography } from '../theme';
import {
  isExpoGoRuntime,
  requestNotificationPermissions,
  scheduleLocalNotification,
} from '../services/notificationService';

const edges = ['top', 'left', 'right', 'bottom'] as const;

export function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const isFocused = useIsFocused();
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!user?.uid || !isFirebaseConfigured()) {
      setItems([]);
      return;
    }
    return subscribeNotifications(user.uid, (newItems) => {
      const unread = newItems.filter((n) => !n.read);
      if (unread.length > prevCountRef.current && prevCountRef.current >= 0) {
        const latest = unread[0];
        if (latest && AppState.currentState !== 'active' && !isExpoGoRuntime) {
          void scheduleLocalNotification({
            title: 'Synestia',
            body: labelFor(latest),
            sound: true,
          });
        }
      }
      prevCountRef.current = unread.length;
      setItems(newItems);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (isFocused && user?.uid && isFirebaseConfigured()) {
      void markNotificationsRead(user.uid);
    }
  }, [isFocused, user?.uid]);

  useEffect(() => {
    void requestNotificationPermissions();
  }, []);

  const displayName =
    user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';

  const onAccept = useCallback(
    async (fromUid: string) => {
      if (!user?.uid) return;
      try {
        await acceptFollowRequest(user.uid, fromUid, displayName);
      } catch (e) {
        Alert.alert('Hata', e instanceof Error ? e.message : 'Kabul edilemedi.');
      }
    },
    [displayName, user?.uid],
  );

  const onReject = useCallback(
    async (fromUid: string) => {
      if (!user?.uid) return;
      try {
        await rejectFollowRequest(user.uid, fromUid);
      } catch (e) {
        Alert.alert('Hata', e instanceof Error ? e.message : 'Reddedilemedi.');
      }
    },
    [user?.uid],
  );

  const onDelete = useCallback(
    async (id: string) => {
      if (!user?.uid) return;
      try {
        await deleteNotification(user.uid, id);
      } catch (e) {
        Alert.alert('Hata', e instanceof Error ? e.message : 'Bildirim silinemedi.');
      }
    },
    [user?.uid],
  );

  if (!isFirebaseConfigured() || !user?.uid) {
    return (
      <ScreenSafeArea edges={edges}>
        <View style={styles.center}>
          <Text style={styles.empty}>Bildirimler için giriş yapın ve Firebase kullanın.</Text>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea edges={edges}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.centerGrow : styles.listPad}
        ListEmptyComponent={
          <Text style={styles.empty}>Henüz bildiriminiz yok</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.read && styles.cardUnread]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardText}>{labelFor(item)}</Text>
              <Pressable onPress={() => void onDelete(item.id)} hitSlop={8} accessibilityLabel="Bildirimi sil">
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            {item.type === 'follow_request' ? (
              <View style={styles.reqRow}>
                <Pressable
                  style={[styles.btn, styles.btnAccept]}
                  onPress={() => void onAccept(item.fromUid)}
                >
                  <Text style={styles.btnAcceptText}>Kabul et</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnReject]}
                  onPress={() => void onReject(item.fromUid)}
                >
                  <Text style={styles.btnRejectText}>Reddet</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />
    </ScreenSafeArea>
  );
}

function labelFor(n: NotificationDoc) {
  switch (n.type) {
    case 'follow_request':
      return `${n.fromDisplayName} sizi takip etmek istiyor`;
    case 'new_follower':
      return `${n.fromDisplayName} sizi takip etmeye başladı`;
    case 'like':
      return `${n.fromDisplayName} gönderinizi beğendi${n.postTitle ? `: ${n.postTitle}` : ''}`;
    case 'comment':
      return `${n.fromDisplayName} yorum yaptı${n.postTitle ? `: ${n.postTitle}` : ''}`;
    default:
      return 'Bildirim';
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  centerGrow: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  listPad: {
    padding: spacing.lg,
    paddingBottom: spacingVertical.xxl,
    backgroundColor: colors.background,
  },
  empty: {
    ...typography.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacingVertical.sm,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.profileAccent,
  },
  cardText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  reqRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacingVertical.md,
  },
  btn: {
    flex: 1,
    paddingVertical: spacingVertical.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  btnAccept: { backgroundColor: colors.accentPurple },
  btnAcceptText: { ...typography.button, color: colors.textOnAccent, fontWeight: '600' },
  btnReject: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  btnRejectText: { ...typography.button, color: colors.danger },
});
