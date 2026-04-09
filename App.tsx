import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { MusicPlayerProvider } from './src/context/MusicPlayerContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initExpoNotifications } from './src/services/notificationService';
import { colors } from './src/theme';

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
    regular: {
      fontFamily: DarkTheme.fonts.regular.fontFamily,
      fontWeight: '400',
    },
    medium: {
      fontFamily: DarkTheme.fonts.medium.fontFamily,
      fontWeight: '500',
    },
    bold: {
      fontFamily: DarkTheme.fonts.bold.fontFamily,
      fontWeight: '600',
    },
    heavy: {
      fontFamily: DarkTheme.fonts.heavy.fontFamily,
      fontWeight: '700',
    },
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
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MusicPlayerProvider>
          <NavigationContainer theme={navTheme}>
            <AppInner />
          </NavigationContainer>
        </MusicPlayerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
