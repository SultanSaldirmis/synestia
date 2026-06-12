import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import 'dayjs/locale/en';
import i18n from '../i18n';
import { useAppSelector } from '../store/hooks';
import { colors } from '../theme';

function applyDayjsLocale(lang: 'tr' | 'en') {
  dayjs.locale(lang === 'en' ? 'en' : 'tr');
}

type Props = {
  children: ReactNode;
};

export function LanguageBootstrap({ children }: Props) {
  const language = useAppSelector((s) => s.ui.language);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void i18n.changeLanguage(language).then(() => {
      if (cancelled) return;
      applyDayjsLocale(language);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accentPurple} />
      </View>
    );
  }

  return children;
}
