import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { apiUrl } from '@/lib/api';
import { clearTokens, getAccessToken, getRefreshToken, onAuthTokensChanged, setTokens } from '@/lib/auth-tokens';
import { getDeviceId } from '@/lib/device-id';
import { setCompAccount } from '@/lib/comp-account';

export type AppUser = {
  id: string;
  phone: string;
  name: string;
  email: string;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  state?: string | null;
};

type UserContextValue = {
  user: AppUser | null;
  loading: boolean;
  refreshMe: () => Promise<void>;
  updateMe: (patch: {
    name?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    state?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);
const USER_CACHE_KEY = 'app_user_cache_v1';

async function readCachedUser(): Promise<AppUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const u = parsed as AppUser;
    if (!u?.id || !u?.phone || !u?.name) return null;
    return u;
  } catch {
    return null;
  }
}

async function writeCachedUser(user: AppUser | null): Promise<void> {
  try {
    if (!user) {
      await AsyncStorage.removeItem(USER_CACHE_KEY);
      return;
    }
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore cache write failures
  }
}

async function fetchMe(token: string) {
  const res = await fetch(apiUrl('/api/public/me'), {
    headers: { 
      Authorization: `Bearer ${token}`, 
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
  if (!res.ok) {
    return { ok: false as const, error: 'Unauthorized' };
  }
  const json = (await res.json()) as { ok?: boolean; user?: AppUser };
  if (!json?.ok || !json.user) {
    return { ok: false as const, error: 'Invalid response' };
  }
  return { ok: true as const, user: json.user };
}

async function tryRefreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return { ok: false as const };
  const deviceId = await getDeviceId();
  const res = await fetch(apiUrl('/api/public/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken, deviceId }),
  });
  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }
  if (!res.ok || !json?.accessToken) return { ok: false as const };
  await setTokens({ accessToken: json.accessToken, refreshToken });
  return { ok: true as const, accessToken: json.accessToken as string };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      await writeCachedUser(null);
      setLoading(false);
      return;
    }

    // If we have a token, show cached user immediately to avoid "Guest" flashes on reload.
    const cached = await readCachedUser();
    if (cached) {
      setUser(cached);
    }
    setLoading(true);
    try {
      const result = await fetchMe(token);
      if (!result.ok) {
        const refreshed = await tryRefreshAccessToken();
        if (!refreshed.ok) {
          // Session might have been revoked (login on another device).
          await clearTokens();
          await writeCachedUser(null);
          setUser(null);
          try {
            router.replace('/login');
          } catch {
            // ignore navigation errors during early boot
          }
          return;
        }
        const retry = await fetchMe(refreshed.accessToken);
        if (!retry.ok) {
          await clearTokens();
          await writeCachedUser(null);
          setUser(null);
          try {
            router.replace('/login');
          } catch {
            // ignore navigation errors during early boot
          }
          return;
        }
        setUser(retry.user);
        await writeCachedUser(retry.user);
        return;
      }
      setUser(result.user);
      await writeCachedUser(result.user);
    } catch {
      // Network / base URL errors: keep cached user if present.
    } finally {
      setLoading(false);
    }
  };

  const updateMe = async (patch: {
    name?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    state?: string;
  }) => {
    const doPatch = async (accessToken: string) => {
      const res = await fetch(apiUrl('/api/public/me'), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(patch),
      });
      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }
      return { res, json } as const;
    };

    const token = await getAccessToken();
    if (!token) return { ok: false as const, error: 'Not logged in' };

    let { res, json } = await doPatch(token);
    if (res.status === 401) {
      const refreshed = await tryRefreshAccessToken();
      if (refreshed.ok) {
        ({ res, json } = await doPatch(refreshed.accessToken));
      }
    }

    if (!res.ok) {
      if (res.status === 401) {
        await clearTokens();
        setUser(null);
        return { ok: false as const, error: 'Session expired. Please login again.' };
      }
      return { ok: false as const, error: json?.error ?? 'Could not update profile' };
    }

    if (json?.user) {
      setUser(json.user as AppUser);
      await writeCachedUser(json.user as AppUser);
    }
    else await refreshMe();
    return { ok: true as const };
  };

  const logout = async () => {
    await clearTokens();
    await writeCachedUser(null);
    setUser(null);
  };

  useEffect(() => {
    void refreshMe();
    const unsub = onAuthTokensChanged(() => {
      void refreshMe();
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Single-device security: if this session is revoked by login on another device,
    // the server will start returning 401 for /me. Poll + foreground checks ensure
    // we auto-logout even when user is idle on the old device.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshMe();
      }
    });
    const id = setInterval(() => {
      void refreshMe();
    }, 30000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    setCompAccount(user?.phone);
  }, [user]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      loading,
      refreshMe,
      updateMe,
      logout,
    }),
    [user, loading]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}

