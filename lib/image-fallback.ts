import type { ImageSourcePropType } from 'react-native';

import { getApiBaseUrl } from '@/lib/api';

export function extractImageUri(source: ImageSourcePropType): string | null {
  if (!source || typeof source === 'number' || Array.isArray(source)) {
    return null;
  }
  if ('uri' in source && typeof source.uri === 'string') {
    return source.uri;
  }
  return null;
}

export function toProxyImageUrl(remoteUrl: string): string | null {
  if (!remoteUrl || remoteUrl.includes('/api/public/image?url=')) return null;
  const base = getApiBaseUrl();
  if (!base) return null;
  return `${base}/api/public/image?url=${encodeURIComponent(remoteUrl)}`;
}

