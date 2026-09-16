import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// Local-only like/save state for quick lessons (no backend yet).
const STORAGE_KEY = 'shorts_engagement_v1';

type EngagementState = { liked: string[]; saved: string[] };
const EMPTY: EngagementState = { liked: [], saved: [] };

export function useShortsEngagement() {
  const [state, setState] = useState<EngagementState>(EMPTY);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<EngagementState>;
        setState({
          liked: Array.isArray(parsed.liked) ? parsed.liked : [],
          saved: Array.isArray(parsed.saved) ? parsed.saved : [],
        });
      } catch {
        // ignore corrupt cache
      }
    })();
  }, []);

  const persist = (next: EngagementState) => {
    setState(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const toggle = (list: 'liked' | 'saved', id: string) => {
    const has = state[list].includes(id);
    persist({ ...state, [list]: has ? state[list].filter((x) => x !== id) : [...state[list], id] });
  };

  const isLiked = useCallback((id: string) => state.liked.includes(id), [state.liked]);
  const isSaved = useCallback((id: string) => state.saved.includes(id), [state.saved]);

  return {
    isLiked,
    isSaved,
    toggleLike: (id: string) => toggle('liked', id),
    toggleSave: (id: string) => toggle('saved', id),
    savedIds: state.saved,
  };
}
