export type VideoAccessMeta = {
  category: string;
  isFree: boolean;
};

export const videoAccessByTitle: Record<string, VideoAccessMeta> = {
  'Nakshatra Foundations': { category: 'Beginner', isFree: false },
  'Transit Prediction Basics': { category: 'Prediction', isFree: false },
  'Karma Houses Deep Dive': { category: 'Prediction', isFree: false },
  'Dasha Practical Case Study': { category: 'Prediction', isFree: false },
  'Marriage Compatibility Logic': { category: 'Prediction', isFree: false },
  'Vimshottari Dasha Full Course': { category: 'Prediction', isFree: false },
  'Transit Timing Masterclass': { category: 'Prediction', isFree: false },
  'Planetary Remedies Handbook': { category: 'Remedies', isFree: true },
  'Gemstones & Mantras Explained': { category: 'Remedies', isFree: false },
  'Astrology Foundations 101': { category: 'Beginner', isFree: true },
  'How to Read Birth Charts': { category: 'Beginner', isFree: true },
  'Planets & Houses Essentials': { category: 'Beginner', isFree: false },
  'Prashna Basics': { category: 'Prediction', isFree: true },
  'Temple Remedies Guide': { category: 'Remedies', isFree: false },
  'Career Houses Deep Dive': { category: 'Career & Finance', isFree: false },
  'Finance Yogas Explained': { category: 'Career & Finance', isFree: true },
  'Business Timing with Dasha': { category: 'Career & Finance', isFree: false },
};
