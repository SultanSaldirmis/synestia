import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import { CreatePostScreen } from '../screens/CreatePostScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { FollowListScreen } from '../screens/FollowListScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { CollectionDetailScreen } from '../screens/CollectionDetailScreen';
import { MusicPlayerScreen } from '../screens/MusicPlayerScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { CrudTestScreen } from '../screens/CrudTestScreen';
import { colors, scale } from '../theme';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accentPurple,
        headerTitleStyle: {
          color: colors.textPrimary,
          fontWeight: '600',
          fontSize: scale(17),
        },
        headerBackTitle: "",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={({ route }) => ({
          title: route.params.title,
        })}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FollowList"
        component={FollowListScreen}
        options={({ route }) => ({
          title:
            route.params.mode === 'followers'
              ? 'Takipçiler'
              : route.params.mode === 'following'
                ? 'Takip edilenler'
                : 'Koleksiyonlar',
        })}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: 'Gönderi oluştur' }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CollectionDetail"
        component={CollectionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MusicPlayer"
        component={MusicPlayerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CrudTest"
        component={CrudTestScreen}
        options={{ title: 'CRUD Test' }}
      />
    </Stack.Navigator>
  );
}
