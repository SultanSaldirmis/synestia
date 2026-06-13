/**
 * Custom Drawer Navigator
 * react-native-reanimated olmadan React Native Animated ile çalışır.
 * Expo Go ile tam uyumludur.
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavigator } from './AppNavigator';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, spacingVertical, typography, radii, scale } from '../theme';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 300);
const ANIM_DURATION = 260;
const DRAWER_LOGO = require('../assets/synestia_background.png');

// ─── Drawer Context ────────────────────────────────────────────────────────
type DrawerContextType = {
  openDrawer: () => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType>({
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

// ─── Drawer Content ────────────────────────────────────────────────────────
type DrawerContentProps = {
  closeDrawer: () => void;
  navigateTo: (screen: string) => void;
};

function DrawerContent({ closeDrawer, navigateTo }: DrawerContentProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const navItem = (icon: string, label: string, screen: string) => (
    <TouchableOpacity
      key={screen}
      style={styles.drawerItem}
      onPress={() => {
        closeDrawer();
        navigateTo(screen);
      }}
      activeOpacity={0.75}
    >
      <Ionicons name={icon as any} size={scale(22)} color={colors.accentPurple} />
      <Text style={styles.drawerItemText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.drawerContent, { paddingTop: insets.top + spacingVertical.md, paddingBottom: insets.bottom + spacingVertical.xl }]}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <View style={styles.avatarCircle}>
          <Image source={DRAWER_LOGO} style={styles.drawerLogo} contentFit="cover" />
        </View>
        <Text style={styles.drawerAppName}>{t('common.appName')}</Text>
        {user && (
          <Text style={styles.drawerEmail} numberOfLines={1}>
            {(user as { email?: string | null }).email ?? ''}
          </Text>
        )}
      </View>

      <View style={styles.divider} />

      {/* Nav Items */}
      {navItem('home-outline', t('drawer.mainApp'), 'MainTabs')}
      {navItem('camera-outline', t('drawer.momentCapture'), 'CameraLocation')}

      <View style={{ flex: 1 }} />

      {/* Logout */}
      <TouchableOpacity
        style={[styles.drawerItem, styles.logoutItem]}
        onPress={() => {
          closeDrawer();
          void signOut();
        }}
        activeOpacity={0.75}
      >
        <Ionicons name="log-out-outline" size={scale(22)} color={colors.danger} />
        <Text style={[styles.drawerItemText, { color: colors.danger }]}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Drawer Navigator ──────────────────────────────────────────────────────
export function DrawerNavigator() {
  const [visible, setVisible] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // navigateTo is set by the child navigator via ref/callback
  const navigationRef = useRef<{ navigate: (screen: string) => void } | null>(null);

  const openDrawer = useCallback(() => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.55,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, overlayOpacity]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: ANIM_DURATION - 30,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: ANIM_DURATION - 30,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [translateX, overlayOpacity]);

  const navigateTo = useCallback((screen: string) => {
    navigationRef.current?.navigate(screen);
  }, []);

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={styles.container}>
        {/* Main App — passes navigationRef setter so drawer can navigate */}
        <AppNavigator setNavigationRef={(ref) => { navigationRef.current = ref; }} />

        {/* Semi-transparent overlay */}
        {visible && (
          <Animated.View
            style={[styles.overlay, { opacity: overlayOpacity }]}
            pointerEvents="auto"
          >
            <TouchableWithoutFeedback onPress={closeDrawer}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>
          </Animated.View>
        )}

        {/* Sliding drawer panel */}
        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX }] },
          ]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <DrawerContent closeDrawer={closeDrawer} navigateTo={navigateTo} />
        </Animated.View>
      </View>
    </DrawerContext.Provider>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 16 },
    }),
  },
  drawerContent: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 0,
  },
  drawerHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacingVertical.md,
    alignItems: 'center',
    gap: spacingVertical.xs,
  },
  avatarCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accentPurple,
    marginBottom: spacingVertical.xs,
    overflow: 'hidden',
  },
  drawerLogo: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
  },
  drawerAppName: {
    ...typography.screenTitle,
    color: colors.accentPurple,
  },
  drawerEmail: {
    ...typography.meta,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacingVertical.sm,
    marginHorizontal: spacing.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacingVertical.sm,
    gap: spacing.md,
    borderRadius: radii.md,
    marginHorizontal: spacing.sm,
    marginVertical: 2,
  },
  drawerItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  logoutItem: {
    marginTop: spacingVertical.sm,
  },
});
