import type { ImageSourcePropType } from 'react-native';

import type { VideoAccessMeta } from '@/constants/video-access';
import { fallbackVideo, type VideoDetails } from '@/constants/video-catalog';
import type { CategoryVideoItem } from '@/constants/videos-by-category';
import type { PublicCatalogPayload, PublicCategoryRow } from '@/lib/public-catalog-types';

export type MergedCatalogState = {
  catalog: Record<string, VideoDetails>;
  videosByCategory: Record<string, CategoryVideoItem[]>;
  categoryThumbnailUrlByName: Record<string, string>;
  videoAccessByTitle: Record<string, VideoAccessMeta>;
  categoryPackTotalPrice: Record<string, string>;
  categoryValidityByName: Record<string, number>;
  packTitleSet: Set<string>;
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
};

function buildPackTitleSet(vbc: Record<string, CategoryVideoItem[]>): Set<string> {
  const s = new Set<string>();
  for (const list of Object.values(vbc)) {
    for (const v of list) {
      s.add(v.title);
    }
  }
  return s;
}

function normalizeRemoteImageUrl(input: string): string {
  const base = process.env.EXPO_PUBLIC_CMS_BASE_URL?.replace(/\/$/, '');
  if (!base) return input;
  try {
    const url = new URL(input);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      const baseUrl = new URL(base);
      url.protocol = baseUrl.protocol;
      url.host = baseUrl.host;
      return url.toString();
    }
    return input;
  } catch {
    if (!input.startsWith('/')) return input;
    return `${base}${input}`;
  }
}

function rowToCategoryItem(row: PublicCategoryRow): CategoryVideoItem {
  return {
    title: row.title,
    subtitle: row.subtitle,
    meta: row.meta,
    priceLabel: row.priceLabel,
    rating: row.rating,
    thumbnail: { uri: normalizeRemoteImageUrl(row.thumbnailUrl) } as ImageSourcePropType,
  };
}

function remoteVideoToDetails(base: VideoDetails | undefined, remote: PublicCatalogPayload['catalog'][string]): VideoDetails {
  const prev = base ?? { ...fallbackVideo, title: remote.title };
  return {
    ...prev,
    title: remote.title,
    subtitle: remote.subtitle,
    meta: remote.meta,
    duration: remote.duration,
    level: remote.level,
    language: remote.language,
    lessons: remote.lessons,
    priceLabel: remote.priceLabel,
    individualPriceLabel: remote.individualPriceLabel ?? prev.individualPriceLabel,
    rating: remote.rating,
    description: remote.description,
    topics: remote.topics?.length ? remote.topics : prev.topics,
    category: remote.category ?? prev.category,
    isFree: remote.isFree ?? prev.isFree,
    accessValidityDays: remote.accessValidityDays ?? prev.accessValidityDays,
    dashUrl: remote.dashUrl,
    hlsUrl: remote.hlsUrl ?? prev.hlsUrl,
    thumbnail: { uri: normalizeRemoteImageUrl(remote.thumbnailUrl) } as ImageSourcePropType,
  };
}

/** Deep-merge remote LMS payload over bundled static catalog defaults. */
export function mergePublicCatalogPayload(remote: PublicCatalogPayload | null): MergedCatalogState {
  if (!remote) {
    return {
      catalog: {},
      videosByCategory: {},
      categoryThumbnailUrlByName: {},
      videoAccessByTitle: {},
      categoryPackTotalPrice: {},
      categoryValidityByName: {},
      packTitleSet: new Set<string>(),
      carouselItems: [],
      homeConfig: {
        recommendedVideoTitles: [],
        featuredCategories: [],
        showContinueWatching: true,
        isReviewMode: false,
        buyButtonText: 'Buy Now',
      },
    };
  }

  const catalog: Record<string, VideoDetails> = {};
  for (const [title, rv] of Object.entries(remote.catalog)) {
    catalog[title] = remoteVideoToDetails(catalog[title], rv);
  }

  const vbc: Record<string, CategoryVideoItem[]> = {};
  const categoryThumbnailUrlByName: Record<string, string> = {};
  const catKeys = new Set(Object.keys(remote.videosByCategory));
  for (const key of catKeys) {
    const remoteList = remote.videosByCategory[key];
    vbc[key] = (remoteList ?? []).map(rowToCategoryItem);
    const categoryThumb = remote.categoryThumbnailUrlByName?.[key];
    if (categoryThumb) {
      categoryThumbnailUrlByName[key] = normalizeRemoteImageUrl(categoryThumb);
    }
  }

  const videoAccessByTitle: Record<string, VideoAccessMeta> = { ...remote.videoAccessByTitle };
  const categoryPackTotalPrice: Record<string, string> = { ...remote.categoryPackTotalPrice };
  const categoryValidityByName: Record<string, number> = { ...remote.categoryValidityByName };

  return {
    catalog,
    videosByCategory: vbc,
    categoryThumbnailUrlByName,
    videoAccessByTitle,
    categoryPackTotalPrice,
    categoryValidityByName,
    packTitleSet: buildPackTitleSet(vbc),
    carouselItems: (remote.carouselItems ?? []).map((c) => ({
      ...c,
      imageUrl: normalizeRemoteImageUrl(c.imageUrl),
    })),
    homeConfig: {
      recommendedVideoTitles: remote.homeConfig?.recommendedVideoTitles ?? [],
      featuredCategories: remote.homeConfig?.featuredCategories ?? [],
      showContinueWatching: remote.homeConfig?.showContinueWatching ?? true,
      isReviewMode: remote.homeConfig?.isReviewMode ?? false,
      buyButtonText: remote.homeConfig?.buyButtonText ?? 'Buy Now',
    },
  };
}
