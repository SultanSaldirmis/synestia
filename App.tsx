import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ActivityIndicator, View } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';

import { store, persistor } from './src/store';
import { AuthProvider } from './src/context/AuthContext';
import { MusicPlayerProvider } from './src/context/MusicPlayerContext';
import { LanguageBootstrap } from './src/components/LanguageBootstrap';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initExpoNotifications } from './src/services/notificationService';
import { colors } from './src/theme';
import './src/i18n';

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accentPurple,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.notification,
  },
  fonts: {
    ...DarkTheme.fonts,
    regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
    medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' },
    bold: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
    heavy: { fontFamily: 'Inter_700Bold', fontWeight: '700' },
  },
};

function AppInner() {
  useEffect(() => {
    void initExpoNotifications();
  }, []);
  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
      <FlashMessage position="top" />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceMono_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1a28' }}>
        <ActivityIndicator size="large" color="#c084fc" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator size="large" color={colors.accentPurple} />
          </View>
        }
        persistor={persistor}
      >
        <SafeAreaProvider>
          <LanguageBootstrap>
            <AuthProvider>
              <MusicPlayerProvider>
                <NavigationContainer theme={navTheme}>
                  <AppInner />
                </NavigationContainer>
              </MusicPlayerProvider>
            </AuthProvider>
          </LanguageBootstrap>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
