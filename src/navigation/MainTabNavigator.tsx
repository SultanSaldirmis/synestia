import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import type { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../config/firebase';
import { subscribeUnreadNotificationCount } from '../services/firestoreService';
import { colors, scale, verticalScale } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON_SIZE = scale(22);
const BADGE_SIZE = scale(18);

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.text}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -scale(4),
    right: -scale(10),
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.profileAccent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
    borderWidth: 1.5,
    borderColor: colors.tabBarBg,
  },
  text: {
    fontSize: scale(10),
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
});

export function MainTabNavigator() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid || !isFirebaseConfigured()) {
      setUnreadCount(0);
      return;
    }
    return subscribeUnreadNotificationCount(user.uid, setUnreadCount);
  }, [user?.uid]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          paddingTop: verticalScale(6),
          minHeight: verticalScale(54),
          ...(Platform.OS === 'android'
            ? { elevation: 8 }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
              }),
        },
        tabBarLabelStyle: { fontSize: scale(11) },
        tabBarActiveTintColor: colors.profileAccent,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Akış',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="compass-outline" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user-circle-o" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? 'notifications' : 'notifications-outline'}
                size={ICON_SIZE}
                color={focused ? colors.profileAccent : color}
              />
              <NotificationBadge count={unreadCount} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
