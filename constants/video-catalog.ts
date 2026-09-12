import type { ImageSourcePropType } from 'react-native';

export type VideoDetails = {
  title: string;
  subtitle: string;
  meta: string;
  duration: string;
  level: string;
  language: string;
  lessons: number;
  priceLabel: string;
  rating: number;
  description: string;
  thumbnail: ImageSourcePropType;
  topics: string[];
  category?: string;
  isFree?: boolean;
  accessValidityDays?: number;
  individualPriceLabel?: string;
  dashUrl: string;
  hlsUrl?: string;
};

export const videoCatalog: Record<string, VideoDetails> = {
  'Nakshatra Foundations': {
    title: 'Nakshatra Foundations',
    subtitle: 'Basics & lunar mansions',
    meta: '12,580 learners',
    duration: '3h 20m',
    level: 'Beginner',
    language: 'Telugu',
    lessons: 14,
    priceLabel: 'Owned',
    individualPriceLabel: '₹999',
    rating: 4.6,
    description:
      'Nakshatra basics ni practical examples tho step-by-step ga nerchukoni, chart lo quick interpretation cheyyadaniki strong base istundi.',
    thumbnail: require('@/assets/images/video-thumb-cosmic-1.jpg'),
    topics: ['What is Nakshatra', 'Pada concepts', 'Moon-based reading', 'Beginner chart examples'],
    category: 'Beginner',
    isFree: false,
    dashUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
  'Transit Prediction Basics': {
    title: 'Transit Prediction Basics',
    subtitle: 'Timing & dasha flow',
    meta: '9,240 learners',
    duration: '2h 45m',
    level: 'Intermediate',
    language: 'Telugu',
    lessons: 11,
    priceLabel: 'Owned',
    individualPriceLabel: '₹1,199',
    rating: 4.4,
    description:
      'Transit + dasha combination tho events timing ela estimate cheyyalo structured ga explain chestundi.',
    thumbnail: require('@/assets/images/video-thumb-cosmic-2.jpg'),
    topics: ['Transit fundamentals', 'Dasha sync', 'Timing windows', 'Prediction mistakes'],
    category: 'Prediction',
    isFree: false,
    dashUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
  'Karma Houses Deep Dive': {
    title: 'Karma Houses Deep Dive',
    subtitle: 'Houses & life themes',
    meta: '8,120 learners',
    duration: '2h 10m',
    level: 'Intermediate',
    language: 'Telugu',
    lessons: 9,
    priceLabel: 'Live Session',
    individualPriceLabel: '₹899',
    rating: 4.5,
    description:
      '12 houses significance ni life themes perspective lo decode chesi real-world use cases tho cover chestundi.',
    thumbnail: require('@/assets/images/video-thumb-cosmic-3.jpg'),
    topics: ['House meanings', 'Karma mapping', 'Life-event links', 'Practical interpretation'],
    category: 'Prediction',
    isFree: false,
    dashUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
  'Dasha Practical Case Study': {
    title: 'Dasha Practical Case Study',
    subtitle: 'Real chart walkthrough',
    meta: '15,200 learners',
    duration: '1h 55m',
    level: 'Advanced',
    language: 'Telugu',
    lessons: 8,
    priceLabel: 'Live Session',
    individualPriceLabel: '₹1,499',
    rating: 4.7,
    description:
      'Real charts ni breakdown chestu, prediction structure build cheyyadaniki case-study format lo guide chestundi.',
    thumbnail: require('@/assets/images/video-thumb-cosmic-4.jpg'),
    topics: ['Case selection', 'Dasha breakdown', 'Transit validation', 'Final prediction notes'],
    category: 'Prediction',
    isFree: false,
    dashUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
  'Marriage Compatibility Logic': {
    title: 'Marriage Compatibility Logic',
    subtitle: 'Synastry essentials',
    meta: '11,400 learners',
    duration: '2h 30m',
    level: 'Intermediate',
    language: 'Telugu',
    lessons: 10,
    priceLabel: 'Live Session',
    individualPriceLabel: '₹1,099',
    rating: 4.3,
    description:
      'Compatibility assessment lo most-used rules ni simple checklists tho explain chesi confusion taggistundi.',
    thumbnail: require('@/assets/images/video-thumb-cosmic-1.jpg'),
    topics: ['Matching fundamentals', 'Dosha checks', 'Synastry basics', 'Decision framework'],
    category: 'Prediction',
    isFree: false,
    dashUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
  'Vimshottari Dasha Full Course': {
    title: 'Vimshottari Dasha Full Course',
    subtitle: 'Complete dasha system',
    meta: '22,100 learners',
    duration: '6h 40m',
    level: 'Advanced',
    language: 'Telugu',
    lessons: 24,
    priceLabel: 'Premium',
    rating: 4.8,
    description:
      'Vimshottari Dasha ni foundation nunchi advanced application varaku complete ga cover chese flagship course.',
    thumbnail: require('@/assets/images/video-thumb-cosmic-2.jpg'),
    topics: ['Mahadasha logic', 'Antardasha impact', 'Event timing', 'Advanced interpretation'],
    category: 'Prediction',
    isFree: false,
    dashUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
  'Transit Timing Masterclass': {
    title: 'Transit Timing Masterclass',
    subtitle: 'Predict with transits',
    meta: '14,300 learners',
    duration: '4h 10m',
    level: 'Advanced',
    language: 'Telugu',
    lessons: 16,
    priceLabel: 'Premium',
    rating: 4.6,
    description:
      'Transit-based event timing ni repeatable method ga build cheyyadaniki charts, rules, exceptions cover chestundi.',
    thumbnail: require('@/assets/images/video-thumb-cosmic-3.jpg'),
    topics: ['Transit layers', 'Event windowing', 'Prioritizing planets', 'Prediction confidence'],
    category: 'Prediction',
    isFree: false,
    dashUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
};

export const fallbackVideo: VideoDetails = {
  title: 'Video Session',
  subtitle: 'Astrology learning module',
  meta: 'Thantra Astro',
  duration: '2h 00m',
  level: 'All Levels',
  language: 'Telugu',
  lessons: 8,
  priceLabel: 'Included',
  rating: 4.5,
  description: 'Detailed video explanation with practical astrology insights and structured learning path.',
  thumbnail: require('@/assets/images/video-thumb-cosmic-1.jpg'),
  topics: ['Introduction', 'Core concepts', 'Examples', 'Summary'],
  category: undefined,
  isFree: false,
  dashUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
};

export function getVideoDetailsByTitle(title: string): VideoDetails {
  return videoCatalog[title] ?? { ...fallbackVideo, title: title || fallbackVideo.title };
}
