import { useEventListener } from 'expo';
import { useCallback, useEffect, useRef } from 'react';
import type { VideoPlayer } from 'expo-video';

import { useLibrary } from '@/providers/library-provider';

const THROTTLE_MS = 6000;

/**
 * Persists max playback position for a title (AsyncStorage) on timeUpdate (throttled)
 * and on unmount / playToEnd.
 */
export function usePersistVideoProgress(
  player: VideoPlayer,
  videoTitle: string | undefined,
  isActive: boolean,
  onSaved?: () => void,
) {
  const { upsertProgress } = useLibrary();
  const lastSaveMs = useRef(0);
  const titleRef = useRef(videoTitle);
  const activeRef = useRef(isActive);
  const onSavedRef = useRef(onSaved);
  titleRef.current = videoTitle;
  activeRef.current = isActive;
  onSavedRef.current = onSaved;

  const saveSnapshot = useCallback(() => {
    const title = titleRef.current;
    if (!title || !activeRef.current) return;
    try {
      const duration = player.duration;
      const t = player.currentTime;
      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(t)) return;
      upsertProgress(title, t, duration)
        .then(() => {
          onSavedRef.current?.();
        })
        .catch(() => {});
      lastSaveMs.current = Date.now();
    } catch {
      // player may be released during teardown
    }
  }, [player, upsertProgress]);

  useEventListener(player, 'timeUpdate', () => {
    const title = titleRef.current;
    if (!title || !activeRef.current) return;
    try {
      const duration = player.duration;
      const t = player.currentTime;
      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(t)) return;
      const now = Date.now();
      if (now - lastSaveMs.current < THROTTLE_MS) return;
      lastSaveMs.current = now;
      upsertProgress(title, t, duration)
        .then(() => {
          onSavedRef.current?.();
        })
        .catch(() => {});
    } catch {
      // no-op
    }
  });

  useEventListener(player, 'playToEnd', () => {
    const title = titleRef.current;
    if (!title || !activeRef.current) return;
    try {
      const duration = player.duration;
      if (Number.isFinite(duration) && duration > 0) {
        upsertProgress(title, duration, duration)
          .then(() => {
            onSavedRef.current?.();
          })
          .catch(() => {});
      }
    } catch {
      // no-op
    }
  });

  useEffect(() => {
    return () => {
      saveSnapshot();
    };
  }, [player, saveSnapshot]);
}
