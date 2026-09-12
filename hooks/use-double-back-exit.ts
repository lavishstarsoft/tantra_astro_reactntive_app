import { useEffect, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';

type Options = {
  enabled?: boolean;
  message?: string;
  intervalMs?: number;
};

export function useDoubleBackExit(options?: Options) {
  const enabled = options?.enabled ?? true;
  const message = options?.message ?? 'Press again, exit now';
  const intervalMs = options?.intervalMs ?? 2000;
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const now = Date.now();
      if (now - lastBackPressRef.current < intervalMs) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressRef.current = now;
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return true;
    });

    return () => subscription.remove();
  }, [enabled, message, intervalMs]);
}

