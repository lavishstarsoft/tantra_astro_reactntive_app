import { useEffect, useState } from 'react';

import { apiUrl } from '@/lib/api';
import { SHORT_LESSONS, type ShortLesson } from '@/constants/shorts';

// Fetch published quick lessons from the dashboard; fall back to bundled
// constants so the feed never renders empty (offline / API down).
let cache: ShortLesson[] | null = null;

async function fetchShorts(): Promise<ShortLesson[]> {
  try {
    const res = await fetch(apiUrl('/api/public/shorts'), { headers: { Accept: 'application/json' } });
    if (!res.ok) return SHORT_LESSONS;
    const json = (await res.json()) as { shorts?: ShortLesson[] };
    const list = Array.isArray(json.shorts) ? json.shorts.filter((s) => s && s.id && s.videoUrl) : [];
    return list.length ? list : SHORT_LESSONS;
  } catch {
    return SHORT_LESSONS;
  }
}

export function useShorts() {
  const [shorts, setShorts] = useState<ShortLesson[]>(cache ?? SHORT_LESSONS);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const list = await fetchShorts();
      if (!alive) return;
      cache = list;
      setShorts(list);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const topics = ['All', ...Array.from(new Set(shorts.map((s) => s.topic)))];
  return { shorts, topics, loading };
}
