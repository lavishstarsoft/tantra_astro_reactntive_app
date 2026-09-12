import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { extractImageUri, toProxyImageUrl } from '@/lib/image-fallback';

type Props = {
  sourceUri: string;
  poster: ImageSourcePropType;
  disabled?: boolean;
  videoTitle?: string;
  onWatchProgressSaved?: () => void;
};

/**
 * Poster-only hero. No inline playback.
 * User taps Play to open dedicated fullscreen player route.
 */
export function HeroInlinePlayer({ sourceUri, poster, disabled, videoTitle }: Props) {
  const [resolvedPoster, setResolvedPoster] = useState<ImageSourcePropType>(poster);

  useEffect(() => {
    setResolvedPoster(poster);
  }, [poster]);

  const openFullscreenPlayer = () => {
    if (disabled) return;
    const encodedId = encodeURIComponent(videoTitle ?? 'video');
    const encodedUrl = encodeURIComponent(sourceUri);
    router.push(`/player/${encodedId}?url=${encodedUrl}`);
  };

  return (
    <Pressable
      style={styles.fill}
      onPress={openFullscreenPlayer}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={disabled ? 'Video locked' : 'Play video in fullscreen'}>
      <Image
        source={resolvedPoster}
        style={styles.fill}
        contentFit="cover"
        onError={() => {
          const uri = extractImageUri(resolvedPoster);
          if (!uri) return;
          const proxy = toProxyImageUrl(uri);
          if (!proxy) return;
          setTimeout(() => setResolvedPoster({ uri: proxy }), 0);
        }}
      />
      <View style={styles.overlay} />
      <View style={[styles.centerButton, disabled && styles.centerButtonDisabled]}>
        <MaterialIcons name={disabled ? 'lock' : 'play-arrow'} size={34} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  centerButton: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
  },
  centerButtonDisabled: {
    opacity: 0.7,
  },
});
