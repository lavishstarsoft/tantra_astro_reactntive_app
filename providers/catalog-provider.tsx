import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { VideoAccessMeta } from '@/constants/video-access';
import type { VideoDetails } from '@/constants/video-catalog';
import { fallbackVideo } from '@/constants/video-catalog';
import type { CategoryVideoItem } from '@/constants/videos-by-category';
import { mergePublicCatalogPayload } from '@/lib/merge-remote-catalog';
import { apiUrl } from '@/lib/api';
import type { PublicCatalogPayload } from '@/lib/public-catalog-types';

export type UpcomingItem = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  kind: 'video' | 'category';
  releaseDate: string | null;
};

export type CatalogContextValue = {
  getVideoDetailsByTitle: (title: string) => VideoDetails;
  allVideos: VideoDetails[];
  carouselItems: {
    title: string;
    subtitle?: string;
    imageUrl: string;
    kind: 'custom' | 'video' | 'category' | 'url';
    target: string;
  }[];
  homeConfig: {
    recommendedVideoTitles: string[];
    featuredCategories: string[];
    showContinueWatching: boolean;
    isReviewMode: boolean;
    buyButtonText: string;
  };
  upcomingItems: UpcomingItem[];
  videosByCategory: Record<string, CategoryVideoItem[]>;
  categoryThumbnailUrlByName: Record<string, string>;
  videoAccessByTitle: Record<string, VideoAccessMeta>;
  getCategoryPackTotalPrice: (category: string) => string | undefined;
  getCategoryValidity: (category: string) => number;
  isInCategoryPack: (title: string) => boolean;
  refresh: () => Promise<void>;
  lastUpdated: string | null;
  remoteError: string | null;
  usingRemote: boolean;
  isLoading: boolean;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<PublicCatalogPayload | null>(null);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [catalogRes, upcomingRes] = await Promise.all([
        fetch(apiUrl('/api/public/catalog'), { headers: { Accept: 'application/json' } }),
        fetch(apiUrl('/api/public/upcoming'), { headers: { Accept: 'application/json' } }),
      ]);

      if (!catalogRes.ok) throw new Error(`Catalog HTTP ${catalogRes.status}`);
      
      const catalogJson = (await catalogRes.json()) as PublicCatalogPayload;
      setRemote(catalogJson);
      setLastUpdated(catalogJson.updatedAt);

      if (upcomingRes.ok) {
        const upcomingJson = await upcomingRes.json();
        setUpcomingItems(upcomingJson);
      }

      setRemoteError(null);
    } catch (e) {
      setRemote(null);
      setRemoteError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });
    return () => {
      sub.remove();
    };
  }, [refresh]);

  const merged = useMemo(() => mergePublicCatalogPayload(remote), [remote]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      getVideoDetailsByTitle: (title: string) =>
        merged.catalog[title] ?? { ...fallbackVideo, title: title || fallbackVideo.title },
      allVideos: Object.values(merged.catalog),
      carouselItems: merged.carouselItems,
      homeConfig: merged.homeConfig,
      upcomingItems,
      videosByCategory: merged.videosByCategory,
      categoryThumbnailUrlByName: merged.categoryThumbnailUrlByName,
      videoAccessByTitle: merged.videoAccessByTitle,
      getCategoryPackTotalPrice: (category: string) => merged.categoryPackTotalPrice[category],
      getCategoryValidity: (category: string) => merged.categoryValidityByName[category] ?? 0,
      isInCategoryPack: (title: string) => merged.packTitleSet.has(title),
      refresh,
      lastUpdated,
      remoteError,
      usingRemote: Boolean(remote),
      isLoading,
    }),
    [merged, refresh, lastUpdated, remoteError, remote, isLoading, upcomingItems]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }
  return ctx;
}
