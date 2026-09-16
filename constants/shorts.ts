/**
 * Quick lessons ("shorts") — short, vertical (9:16) educational clips shown in a
 * full-screen swipe feed (app/shorts.tsx) and as a rail on Home.
 *
 * App-only data source for now: edit this list to add/remove clips.
 * Recommended clip spec: 9:16 portrait, 1080×1920, 15–60 s, HLS (.m3u8) or MP4.
 * When a backend endpoint exists, swap `SHORT_LESSONS` for a fetch — the feed
 * and rail only read from here.
 */
export type ShortLesson = {
  id: string;
  title: string;
  /** Topic used for the filter chips (e.g. Nakshatra, Navagraha, Vastu). */
  topic: string;
  teacher: string;
  /** HLS (.m3u8) or MP4 URL. HLS plays on both iOS (AVPlayer) and Android (ExoPlayer). */
  videoUrl: string;
  /** Optional portrait thumbnail for the Home rail. */
  thumbnail?: string;
  /** Seconds. */
  duration: number;
  /** Exact title of a catalog video — enables the "Full lesson" button. */
  linkedVideoTitle?: string;
  /** Optional one-line on-screen caption (many users watch muted). */
  caption?: string;
};

// Sample clips so the feed works out of the box. Replace with your own clips.
const SAMPLE_HLS = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8';

export const SHORT_LESSONS: ShortLesson[] = [
  {
    id: 'rahu-shadow-graha',
    title: 'Why Rahu and Ketu are called shadow planets',
    topic: 'Navagraha',
    teacher: 'Dr. Chintha Rukmangada Rao',
    videoUrl: SAMPLE_HLS,
    duration: 42,
    linkedVideoTitle: "RAHU GRASTA KAALASARPA DOSHAM REMEDIES | DON'T TAKE IT LIGHTLY!",
    caption: 'Rahu is a shadow graha, not a physical planet.',
  },
  {
    id: 'nakshatra-27',
    title: '27 Nakshatras in 60 seconds',
    topic: 'Nakshatra',
    teacher: 'Dr. Chintha Rukmangada Rao',
    videoUrl: SAMPLE_HLS,
    duration: 58,
    caption: 'The zodiac is divided into 27 Nakshatras of 13°20′ each.',
  },
  {
    id: 'nakshatra-padas',
    title: 'What is a Nakshatra pada?',
    topic: 'Nakshatra',
    teacher: 'Dr. Chintha Rukmangada Rao',
    videoUrl: SAMPLE_HLS,
    duration: 35,
    caption: 'Every Nakshatra has 4 padas of 3°20′.',
  },
  {
    id: 'vastu-entrance',
    title: 'Main entrance direction basics in Vastu',
    topic: 'Vastu',
    teacher: 'Dr. Chintha Rukmangada Rao',
    videoUrl: SAMPLE_HLS,
    duration: 50,
  },
];

/** "All" first, then topics in the order they appear. */
export const SHORT_TOPICS: string[] = ['All', ...Array.from(new Set(SHORT_LESSONS.map((s) => s.topic)))];
