import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';

import { watchProgressPercent } from '@/constants/watch-progress-storage';
import { useLibrary } from '@/providers/library-provider';

export function useWatchProgressMap() {
  const { progressMap: map, refreshAll } = useLibrary();

  const refresh = useCallback(() => {
    return refreshAll();
  }, [refreshAll]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const progressForTitle = useMemo(() => {
    return (title: string) => watchProgressPercent(map[title]);
  }, [map]);

  return { map, progressForTitle, refresh };
}
