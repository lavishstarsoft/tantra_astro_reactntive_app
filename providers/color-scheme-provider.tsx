import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemePreference = 'system' | 'light' | 'dark';

type AppColorSchemeContextValue = {
  colorScheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
};

const STORAGE_KEY = 'app_theme_preference';

const AppColorSchemeContext = createContext<AppColorSchemeContextValue | null>(null);

export function AppColorSchemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!active) return;
        if (value === 'light' || value === 'dark' || value === 'system') {
          setPreferenceState(value);
        }
      })
      .catch(() => {
        // Ignore read failures and keep default behavior.
      });

    return () => {
      active = false;
    };
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Ignore write failures so UI can continue.
    });
  };

  const colorScheme: 'light' | 'dark' = preference === 'system' ? (systemScheme ?? 'light') : preference;

  const value = useMemo(
    () => ({
      colorScheme,
      preference,
      setPreference,
    }),
    [colorScheme, preference]
  );

  return <AppColorSchemeContext.Provider value={value}>{children}</AppColorSchemeContext.Provider>;
}

export function useAppColorScheme() {
  const context = useContext(AppColorSchemeContext);
  if (!context) {
    throw new Error('useAppColorScheme must be used within AppColorSchemeProvider');
  }
  return context;
}
