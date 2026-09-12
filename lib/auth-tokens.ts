import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'app_access_token';
const REFRESH_KEY = 'app_refresh_token';
const LAST_LOGIN_AT_KEY = 'app_last_login_at';

type AuthTokenListener = () => void;
const listeners = new Set<AuthTokenListener>();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  });
}

export function onAuthTokensChanged(listener: AuthTokenListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function setTokens(tokens: { accessToken: string; refreshToken?: string }) {
  await AsyncStorage.setItem(ACCESS_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    await AsyncStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    await AsyncStorage.setItem(LAST_LOGIN_AT_KEY, new Date().toISOString());
  }
  notify();
}

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function getLastLoginAt() {
  return AsyncStorage.getItem(LAST_LOGIN_AT_KEY);
}

export async function getLastLoginAtFallback() {
  const saved = await getLastLoginAt();
  if (saved) return saved;

  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  // Backfill for older sessions created before LAST_LOGIN_AT_KEY existed.
  const iso = new Date().toISOString();
  await AsyncStorage.setItem(LAST_LOGIN_AT_KEY, iso);
  return iso;
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  notify();
}

