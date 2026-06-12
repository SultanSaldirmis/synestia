import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { MapPickerScreen } from '../screens/MapPickerScreen';
import { CameraLocationScreen } from '../screens/CameraLocationScreen';
import { colors, scale } from '../theme';

const Stack = createNativeStackNavigator<AppStackParamList>();

type Props = {
  setNavigationRef?: (ref: { navigate: (screen: string) => void } | null) => void;
};

/** Exposes navigation ref to the parent DrawerNavigator for programmatic navigation */
function NavigationBridge({ setNavigationRef }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isMounted = useRef(true);

  useEffect(() => {
    if (setNavigationRef) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setNavigationRef({ navigate: (screen) => (navigation as any).navigate(screen) });
    }
    return () => {
      isMounted.current = false;
      if (setNavigationRef) setNavigationRef(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  return null;
}

export function AppNavigator({ setNavigationRef }: Props) {
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
      <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
        {() => (
          <>
            <NavigationBridge setNavigationRef={setNavigationRef} />
            <MainTabNavigator />
          </>
        )}
      </Stack.Screen>
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
      <Stack.Screen
        name="MapPicker"
        component={MapPickerScreen}
        options={{ title: 'Konum Seç' }}
      />
      <Stack.Screen
        name="CameraLocation"
        component={CameraLocationScreen}
        options={{ title: 'Anı Kaydet', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
