import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@astro_watch_progress_v1';

export type WatchProgressEntry = {
  currentTime: number;
  duration: number;
  updatedAt: number;
};

export type WatchProgressMap = Record<string, WatchProgressEntry>;

export async function getWatchProgressMap(): Promise<WatchProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as WatchProgressMap;
    }
    return {};
  } catch {
    return {};
  }
}

export async function mergeWatchProgress(
  title: string,
  currentTime: number,
  duration: number,
): Promise<void> {
  if (!title || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime) || currentTime < 0) {
    return;
  }
  const map = await getWatchProgressMap();
  const prev = map[title];
  const capped = Math.min(currentTime, duration);
  const nextTime = Math.max(capped, prev?.currentTime ?? 0);
  const nextDuration = Math.max(duration, prev?.duration ?? 0);
  map[title] = {
    currentTime: Math.min(nextTime, nextDuration),
    duration: nextDuration,
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function watchProgressPercent(entry: WatchProgressEntry | undefined): number | null {
  if (!entry || !Number.isFinite(entry.duration) || entry.duration <= 0) return null;
  if (!Number.isFinite(entry.currentTime) || entry.currentTime <= 0.25) return null;
  const p = (entry.currentTime / entry.duration) * 100;
  if (!Number.isFinite(p)) return null;
  return Math.min(100, Math.max(1, Math.round(p)));
}
