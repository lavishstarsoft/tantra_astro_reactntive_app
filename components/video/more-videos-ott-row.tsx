import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { extractImageUri, toProxyImageUrl } from '@/lib/image-fallback';

type Props = {
  title: string;
  metaLine: string;
  description: string;
  thumbnail: ImageSourcePropType;
  /** Highlights the row for the video the user is currently on. */
  isCurrent?: boolean;
  accentColor?: string;
  /** 1–100: watch progress strip on thumbnail bottom (from stored playback). */
  thumbProgressPercent?: number | null;
  onPress: () => void;
  onDownloadPress?: () => void;
};

/**
 * Vertical “episode” row inspired by OTT apps: thumb + title/meta + download,
 * then a multi-line synopsis below.
 */
export function MoreVideosOttRow({
  title,
  metaLine,
  description,
  thumbnail,
  isCurrent,
  accentColor = '#7C3AED',
  thumbProgressPercent,
  onPress,
  onDownloadPress,
}: Props) {
  const downloadEnabled = Boolean(onDownloadPress);
  const initialThumbnail = useMemo(() => thumbnail, [thumbnail]);
  const [resolvedThumbnail, setResolvedThumbnail] = useState<ImageSourcePropType>(initialThumbnail);

  useEffect(() => {
    setResolvedThumbnail(initialThumbnail);
  }, [initialThumbnail]);

  return (
    <View
      style={[
        styles.card,
        !isCurrent && styles.cardDivider,
        isCurrent && styles.cardCurrent,
        isCurrent && { borderColor: accentColor, backgroundColor: `${accentColor}18` },
      ]}>
      <View style={styles.topRow}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.mainTap, pressed && !isCurrent && styles.mainTapPressed]}
          disabled={isCurrent}
          accessibilityRole="button"
          accessibilityLabel={isCurrent ? `Now watching: ${title}` : `Open ${title}`}>
          <View style={styles.thumbWrap}>
            <Image
              source={resolvedThumbnail}
              style={styles.thumb}
              contentFit="cover"
              onError={() => {
                const uri = extractImageUri(resolvedThumbnail);
                if (!uri) return;
                const proxy = toProxyImageUrl(uri);
                if (!proxy) return;
                setTimeout(() => setResolvedThumbnail({ uri: proxy }), 0);
              }}
            />
            <View style={styles.playOverlay} pointerEvents="none">
              <View style={[styles.playCircle, isCurrent && styles.playCircleCurrent]}>
                <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" style={styles.playIconShift} />
              </View>
            </View>
            {thumbProgressPercent != null ? (
              <View style={styles.thumbProgressTrack} pointerEvents="none">
                <View
                  style={[
                    styles.thumbProgressFill,
                    { width: `${Math.min(100, Math.max(0, thumbProgressPercent))}%`, backgroundColor: accentColor },
                  ]}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.textCol}>
            <Text style={[styles.title, isCurrent && { color: accentColor }]} numberOfLines={2}>
              {title}
            </Text>
            <Text style={[styles.metaLine, isCurrent && styles.metaLineCurrent]} numberOfLines={2}>
              {metaLine}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={onDownloadPress}
          hitSlop={12}
          style={styles.downloadHit}
          accessibilityRole="button"
          accessibilityLabel="Download"
          disabled={!downloadEnabled}>
          <MaterialIcons
            name="download"
            size={22}
            color="#FFFFFF"
            style={!downloadEnabled ? styles.downloadMuted : undefined}
          />
        </Pressable>
      </View>

      <Pressable
        onPress={onPress}
        disabled={isCurrent}
        accessibilityRole="button"
        accessibilityLabel={`About ${title}`}>
        <Text style={[styles.description, isCurrent && styles.descriptionCurrent]} numberOfLines={3}>
          {description}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    paddingHorizontal: 2,
    marginBottom: 2,
    borderRadius: 12,
  },
  cardDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  cardCurrent: {
    borderWidth: 2,
    paddingHorizontal: 8,
    marginVertical: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  mainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minWidth: 0,
  },
  mainTapPressed: {
    opacity: 0.88,
  },
  thumbWrap: {
    width: 124,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  playCircleCurrent: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  playIconShift: {
    marginLeft: 3,
  },
  thumbProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 4,
  },
  thumbProgressFill: {
    height: '100%',
    borderBottomLeftRadius: 8,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingTop: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  metaLine: {
    marginTop: 6,
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  metaLineCurrent: {
    color: '#D1D5DB',
    fontWeight: '700',
  },
  downloadHit: {
    paddingTop: 4,
    paddingLeft: 2,
  },
  downloadMuted: {
    opacity: 0.35,
  },
  description: {
    marginTop: 12,
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  descriptionCurrent: {
    color: '#D1D5DB',
  },
});
