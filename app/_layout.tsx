import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppColorSchemeProvider } from '@/providers/color-scheme-provider';
import { CatalogProvider } from '@/providers/catalog-provider';
import { LibraryProvider } from '@/providers/library-provider';
import { PurchaseProvider } from '@/providers/purchase-provider';
import { PracticeProvider } from '@/providers/practice-provider';
import { UserProvider } from '@/providers/user-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event.
});

export const unstable_settings = {
  anchor: '(tabs)',
};

// Global Error Boundary
import { View, Text, Pressable, StyleSheet } from 'react-native';
export function ErrorBoundary(props: any) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorEmoji}>⚠️</Text>
      <Text style={styles.errorTitle}>Oops! Something went wrong.</Text>
      <Text style={styles.errorMessage}>
        An unexpected error occurred. Our team has been notified.
      </Text>
      <Pressable style={styles.retryButton} onPress={props.retry}>
        <Text style={styles.retryText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0A0E14', // Matching your mystical theme
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#9BA3AF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#C0C6CF',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2933',
  },
});

function RootLayout() {
  return (
    <AppColorSchemeProvider>
      <CatalogProvider>
        <UserProvider>
          <LibraryProvider>
            <NotificationProvider>
              <PurchaseProvider>
                <PracticeProvider>
                  <RootNavigator />
                </PracticeProvider>
              </PurchaseProvider>
            </NotificationProvider>
          </LibraryProvider>
        </UserProvider>
      </CatalogProvider>
    </AppColorSchemeProvider>
  );
}

export default Sentry.wrap(RootLayout);

function RootNavigator() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const appBg = Colors[scheme].appBg;
  const appTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: appBg,
      card: appBg,
    },
  };
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(appBg);
  }, [appBg]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const applyNavBarTheme = async () => {
      const isDark = scheme === 'dark';
      // setBackgroundColorAsync is not supported with edge-to-edge enabled.
      // Only set the button style (icon color) for the navigation bar.
      await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    };

    applyNavBarTheme().catch(() => {
      // Ignore on platforms/environments where nav bar APIs are unavailable.
    });
  }, [scheme]);

  return (
    <ThemeProvider value={appTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 320,
          gestureEnabled: true,
          animationTypeForReplace: 'push',
          contentStyle: { backgroundColor: appBg },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" options={{ animation: 'slide_from_left' }} />
        <Stack.Screen name="otp" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="register-otp" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="categories" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="category/[name]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="video/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="quiz/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shorts" options={{ animation: 'slide_from_bottom', gestureEnabled: true }} />
        <Stack.Screen name="player/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="security" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="help-center" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="payment/success" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="payment/checkout" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} backgroundColor={appBg} />
    </ThemeProvider>
  );
}
