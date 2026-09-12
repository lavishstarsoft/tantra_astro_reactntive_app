import type { ImageSourcePropType } from 'react-native';

/**
 * Videos listed under a category pack are sold only via the pack, not as individual purchases.
 * Standalone catalog videos (not listed here) can be bought individually.
 */

export type CategoryVideoItem = {
  title: string;
  subtitle: string;
  meta: string;
  priceLabel: string;
  rating: number;
  thumbnail: ImageSourcePropType;
};

export const CATEGORY_PACK_TOTAL_PRICE: Record<string, string> = {
  Beginner: '₹4,999',
  Prediction: '₹7,999',
  Remedies: '₹3,499',
  'Career & Finance': '₹4,499',
};

export const videosByCategory: Record<string, CategoryVideoItem[]> = {
  Beginner: [
    {
      title: 'Astrology Foundations 101',
      subtitle: 'Start from zero',
      meta: '45,200 learners',
      priceLabel: 'FREE',
      rating: 4.7,
      thumbnail: require('@/assets/images/video-thumb-cosmic-2.jpg'),
    },
    {
      title: 'How to Read Birth Charts',
      subtitle: 'Step-by-step charts',
      meta: '31,600 learners',
      priceLabel: 'FREE',
      rating: 4.6,
      thumbnail: require('@/assets/images/video-thumb-cosmic-3.jpg'),
    },
    {
      title: 'Planets & Houses Essentials',
      subtitle: 'Core building blocks',
      meta: '18,400 learners',
      priceLabel: '₹1,299',
      rating: 4.5,
      thumbnail: require('@/assets/images/video-thumb-cosmic-1.jpg'),
    },
  ],
  Prediction: [
    {
      title: 'Vimshottari Dasha Full Course',
      subtitle: 'Complete dasha system',
      meta: '22,100 learners',
      priceLabel: '₹1,999',
      rating: 4.8,
      thumbnail: require('@/assets/images/video-thumb-cosmic-2.jpg'),
    },
    {
      title: 'Transit Timing Masterclass',
      subtitle: 'Predict with transits',
      meta: '14,300 learners',
      priceLabel: '₹1,499',
      rating: 4.6,
      thumbnail: require('@/assets/images/video-thumb-cosmic-3.jpg'),
    },
    {
      title: 'Prashna Basics',
      subtitle: 'Horary intro',
      meta: '7,800 learners',
      priceLabel: 'FREE',
      rating: 4.3,
      thumbnail: require('@/assets/images/video-thumb-cosmic-4.jpg'),
    },
  ],
  Remedies: [
    {
      title: 'Planetary Remedies Handbook',
      subtitle: 'Remedies that work',
      meta: '19,800 learners',
      priceLabel: 'FREE',
      rating: 4.5,
      thumbnail: require('@/assets/images/video-thumb-cosmic-4.jpg'),
    },
    {
      title: 'Gemstones & Mantras Explained',
      subtitle: 'Premium bonus module',
      meta: '6,900 learners',
      priceLabel: '₹899',
      rating: 4.4,
      thumbnail: require('@/assets/images/video-thumb-cosmic-1.jpg'),
    },
    {
      title: 'Temple Remedies Guide',
      subtitle: 'Rituals & timing',
      meta: '8,100 learners',
      priceLabel: '₹1,199',
      rating: 4.7,
      thumbnail: require('@/assets/images/video-thumb-cosmic-3.jpg'),
    },
  ],
  'Career & Finance': [
    {
      title: 'Career Houses Deep Dive',
      subtitle: '10th & 6th focus',
      meta: '12,400 learners',
      priceLabel: '₹1,799',
      rating: 4.6,
      thumbnail: require('@/assets/images/video-thumb-cosmic-1.jpg'),
    },
    {
      title: 'Finance Yogas Explained',
      subtitle: 'Wealth combinations',
      meta: '9,200 learners',
      priceLabel: 'FREE',
      rating: 4.5,
      thumbnail: require('@/assets/images/video-thumb-cosmic-2.jpg'),
    },
    {
      title: 'Business Timing with Dasha',
      subtitle: 'Launch & growth',
      meta: '6,600 learners',
      priceLabel: '₹1,299',
      rating: 4.4,
      thumbnail: require('@/assets/images/video-thumb-cosmic-4.jpg'),
    },
  ],
};

const packTitleSet = new Set<string>();
for (const list of Object.values(videosByCategory)) {
  for (const v of list) {
    packTitleSet.add(v.title);
  }
}

/** Titles that appear in a category pack list — these cannot be purchased as single videos. */
export function isInCategoryPack(title: string): boolean {
  return packTitleSet.has(title);
}

export function getCategoryPackTotalPrice(category: string): string | undefined {
  return CATEGORY_PACK_TOTAL_PRICE[category];
}
