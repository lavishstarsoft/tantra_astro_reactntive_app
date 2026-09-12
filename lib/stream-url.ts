import { Platform } from 'react-native';

/**
 * Pick the correct stream for the current platform.
 * iOS (AVPlayer) supports HLS (.m3u8) only — DASH (.mpd) fails with -11828.
 * Android (ExoPlayer) uses DASH. Each falls back to the other if missing.
 */
export function getStreamUrl(v: { dashUrl?: string | null; hlsUrl?: string | null }): string {
  const hls = v.hlsUrl ?? '';
  const dash = v.dashUrl ?? '';
  if (Platform.OS === 'ios') return hls || dash;
  return dash || hls;
}
