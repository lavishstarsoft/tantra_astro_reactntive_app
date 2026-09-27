/** Mirrors `lms-dashboard` GET /api/public/catalog JSON (version 1). */

export type PublicCatalogVideo = {
  title: string;
  subtitle: string;
  meta: string;
  duration: string;
  level: string;
  language: string;
  lessons: number;
  priceLabel: string;
  individualPriceLabel?: string;
  rating: number;
  description: string;
  thumbnailUrl: string;
  topics: string[];
  category?: string;
  isFree?: boolean;
  accessValidityDays?: number;
  pricingTiers?: { days: number; amountCents: number; label: string }[];
  dashUrl: string;
  hlsUrl?: string;
};

export type PublicCategoryRow = {
  title: string;
  subtitle: string;
  meta: string;
  priceLabel: string;
  rating: number;
  thumbnailUrl: string;
};

export type PublicCatalogPayload = {
  version: number;
  updatedAt: string;
  carouselItems?: {
    title: string;
    subtitle?: string;
    imageUrl: string;
    kind: 'custom' | 'video' | 'category' | 'url';
    target: string;
  }[];
  catalog: Record<string, PublicCatalogVideo>;
  videosByCategory: Record<string, PublicCategoryRow[]>;
  categoryThumbnailUrlByName?: Record<string, string>;
  categoryPackTotalPrice: Record<string, string>;
  categoryValidityByName: Record<string, number>;
  videoAccessByTitle: Record<string, { category: string; isFree: boolean; accessValidityDays: number }>;
  homeConfig?: {
    recommendedVideoTitles: string[];
    featuredCategories: string[];
    showContinueWatching: boolean;
    isReviewMode: boolean;
    buyButtonText: string;
  };
};
