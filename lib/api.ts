import Constants from 'expo-constants';

export function getApiBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_CMS_BASE_URL?.replace(/\/$/, '');
  if (!base) {
    // Helpful fallback for local dev with Expo on device.
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
    const host = hostUri?.split(':')[0];
    if (host) {
      return `http://${host}:3000`;
    }
    return '';
  }
  return base;
}

export function apiUrl(path: string) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('EXPO_PUBLIC_CMS_BASE_URL is not set');
  }
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

