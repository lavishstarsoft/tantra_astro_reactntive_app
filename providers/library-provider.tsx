import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { clearTokens, getRefreshToken, getAccessToken, onAuthTokensChanged, setTokens } from '@/lib/auth-tokens';
import { apiUrl } from '@/lib/api';
import { getDeviceId } from '@/lib/device-id';

export type ProgressEntry = {
  currentTime: number;
  duration: number;
  updatedAt: number;
};

type LibraryContextValue = {
  bookmarks: string[];
  categoryBookmarks: string[];
  progressMap: Record<string, ProgressEntry>;
  refreshAll: () => Promise<void>;
  toggleBookmark: (videoTitle: string) => Promise<boolean>;
  toggleCategoryBookmark: (categoryName: string) => Promise<boolean>;
  upsertProgress: (videoTitle: string, currentTime: number, duration: number) => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

async function getAuthorizedToken(): Promise<string | null> {
  const accessToken = await getAccessToken();
  if (accessToken) return accessToken;
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
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
  if (!res.ok || !json?.accessToken) {
    if (res.status === 401) {
      await clearTokens();
      try {
        router.replace('/login');
      } catch {
        // ignore navigation errors during early boot
      }
    }
    return null;
  }
  await setTokens({ accessToken: json.accessToken, refreshToken });
  return json.accessToken as string;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [categoryBookmarks, setCategoryBookmarks] = useState<string[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressEntry>>({});

  const refreshAll = useCallback(async () => {
    const token = await getAuthorizedToken();
    if (!token) {
      setBookmarks([]);
      setCategoryBookmarks([]);
      setProgressMap({});
      return;
    }

    const [bookmarksRes, categoryBookmarksRes, progressRes] = await Promise.all([
      fetch(apiUrl('/api/public/bookmarks/me'), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Cache-Control': 'no-cache' },
      }),
      fetch(apiUrl('/api/public/bookmarks/categories/me'), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Cache-Control': 'no-cache' },
      }),
      fetch(apiUrl('/api/public/progress/me'), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Cache-Control': 'no-cache' },
      }),
    ]);

    if (bookmarksRes.ok) {
      const data = (await bookmarksRes.json()) as { bookmarkedTitles?: string[] };
      setBookmarks(Array.isArray(data.bookmarkedTitles) ? data.bookmarkedTitles : []);
    }

    if (categoryBookmarksRes.ok) {
      const data = (await categoryBookmarksRes.json()) as { bookmarkedCategoryNames?: string[] };
      setCategoryBookmarks(Array.isArray(data.bookmarkedCategoryNames) ? data.bookmarkedCategoryNames : []);
    }

    if (progressRes.ok) {
      const data = (await progressRes.json()) as {
        progress?: Array<{ videoTitle: string; currentTime: number; duration: number; updatedAt: string }>;
      };
      const next: Record<string, ProgressEntry> = {};
      for (const row of data.progress ?? []) {
        if (!row.videoTitle) continue;
        next[row.videoTitle] = {
          currentTime: Math.max(0, row.currentTime ?? 0),
          duration: Math.max(0, row.duration ?? 0),
          updatedAt: Date.parse(row.updatedAt) || Date.now(),
        };
      }
      setProgressMap(next);
    }
  }, []);

  const toggleBookmark = useCallback(async (videoTitle: string) => {
    const token = await getAuthorizedToken();
    if (!token) return false;
    const wasBookmarked = bookmarks.includes(videoTitle);
    // Optimistic UI for instant fill/remove feedback.
    setBookmarks((prev) => (wasBookmarked ? prev.filter((title) => title !== videoTitle) : [videoTitle, ...prev]));
    const res = await fetch(apiUrl('/api/public/bookmarks/toggle'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ videoTitle }),
    });
    if (!res.ok) {
      // Revert optimistic change on failure.
      setBookmarks((prev) => (wasBookmarked ? [videoTitle, ...prev] : prev.filter((title) => title !== videoTitle)));
      return wasBookmarked;
    }
    const json = (await res.json()) as { bookmarked?: boolean };
    const bookmarked = Boolean(json.bookmarked);
    setBookmarks((prev) => {
      if (bookmarked) {
        return prev.includes(videoTitle) ? prev : [videoTitle, ...prev];
      }
      return prev.filter((title) => title !== videoTitle);
    });
    return bookmarked;
  }, [bookmarks]);

  const toggleCategoryBookmark = useCallback(async (categoryName: string) => {
    const token = await getAuthorizedToken();
    if (!token) return false;
    const wasBookmarked = categoryBookmarks.includes(categoryName);
    setCategoryBookmarks((prev) => (wasBookmarked ? prev.filter((name) => name !== categoryName) : [categoryName, ...prev]));
    const res = await fetch(apiUrl('/api/public/bookmarks/categories/toggle'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ categoryName }),
    });
    if (!res.ok) {
      setCategoryBookmarks((prev) =>
        wasBookmarked ? [categoryName, ...prev] : prev.filter((name) => name !== categoryName)
      );
      return wasBookmarked;
    }
    const json = (await res.json()) as { bookmarked?: boolean };
    const bookmarked = Boolean(json.bookmarked);
    setCategoryBookmarks((prev) => {
      if (bookmarked) {
        return prev.includes(categoryName) ? prev : [categoryName, ...prev];
      }
      return prev.filter((name) => name !== categoryName);
    });
    return bookmarked;
  }, [categoryBookmarks]);

  const upsertProgress = useCallback(async (videoTitle: string, currentTime: number, duration: number) => {
    if (!videoTitle || !Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
      return;
    }
    const nextCurrent = Math.max(0, Math.min(currentTime, duration));
    setProgressMap((prev) => {
      const old = prev[videoTitle];
      return {
        ...prev,
        [videoTitle]: {
          currentTime: Math.max(nextCurrent, old?.currentTime ?? 0),
          duration: Math.max(duration, old?.duration ?? 0),
          updatedAt: Date.now(),
        },
      };
    });

    const token = await getAuthorizedToken();
    if (!token) return;
    await fetch(apiUrl('/api/public/progress/upsert'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ videoTitle, currentTime: nextCurrent, duration }),
    });
  }, []);

  useEffect(() => {
    void refreshAll();
    const unsub = onAuthTokensChanged(() => {
      void refreshAll();
    });
    return unsub;
  }, [refreshAll]);

  const value = useMemo<LibraryContextValue>(
    () => ({
      bookmarks,
      categoryBookmarks,
      progressMap,
      refreshAll,
      toggleBookmark,
      toggleCategoryBookmark,
      upsertProgress,
    }),
    [bookmarks, categoryBookmarks, progressMap, refreshAll, toggleBookmark, toggleCategoryBookmark, upsertProgress]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error('useLibrary must be used within LibraryProvider');
  }
  return ctx;
}
