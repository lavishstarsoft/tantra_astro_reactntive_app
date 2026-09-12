import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { extractImageUri, toProxyImageUrl } from '@/lib/image-fallback';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppColorScheme } from '@/providers/color-scheme-provider';
import { isCompAccount } from '@/lib/comp-account';

function normalizeRupeeLabel(input: string): string {
  const text = input.trim();
  if (!text) return input;
  if (text.includes('₹')) return text;
  if (/^\d+(?:\.\d+)?$/.test(text)) return `₹${text}`;
  return text;
}

export type VideoRowCardProps = {
  thumbnail: ImageSourcePropType;
  title: string;
  subtitle?: string;
  meta: string;
  description?: string;
  showPremiumBadge?: boolean;
  priceLabel: string;
  rating: number;
  progressPercent?: number;
  /** Filled bookmark when video is saved (e.g. Bookmarks tab). */
  bookmarked?: boolean;
  onBookmarkPress?: () => void;
  onPress?: () => void;
};

export function VideoRowCard({
  thumbnail,
  title,
  meta,
  description,
  showPremiumBadge,
  priceLabel,
  rating,
  progressPercent,
  bookmarked,
  onBookmarkPress,
  onPress,
}: VideoRowCardProps) {
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const surfaceAlt = useThemeColor({}, 'appSurfaceAlt');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');
  const iconSecondary = useThemeColor({}, 'appTabIconActive');
  const { colorScheme } = useAppColorScheme();
  
  const comp = isCompAccount();
  const effectivePriceLabel = comp ? '' : priceLabel;
  const effectiveShowBadge = comp ? false : showPremiumBadge;
  const isUnlocked = priceLabel === 'UNLOCKED';
  const priceColor = isUnlocked 
    ? (colorScheme === 'dark' ? '#FFFFFF' : '#800000')
    : textPrimary;
  const initialThumbnail = useMemo(() => thumbnail, [thumbnail]);
  const [resolvedThumbnail, setResolvedThumbnail] = useState<ImageSourcePropType>(initialThumbnail);
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const bookmarkBurst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setResolvedThumbnail(initialThumbnail);
  }, [initialThumbnail]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.card, { backgroundColor: cardBg, borderColor: border }, pressed && onPress && styles.cardPressed]}>
      <Image
        source={resolvedThumbnail}
        style={[styles.thumb, { backgroundColor: surfaceAlt }]}
        contentFit="cover"
        onError={() => {
          const uri = extractImageUri(resolvedThumbnail);
          if (!uri) return;
          const proxy = toProxyImageUrl(uri);
          if (!proxy) return;
          setTimeout(() => setResolvedThumbnail({ uri: proxy }), 0);
        }}
      />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: accent }]} numberOfLines={1}>
            {title}
          </Text>
          {onBookmarkPress ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                bookmarkBurst.setValue(1);
                Animated.sequence([
                  Animated.spring(bookmarkScale, { toValue: 1.18, friction: 6, tension: 220, useNativeDriver: true }),
                  Animated.spring(bookmarkScale, { toValue: 1, friction: 7, tension: 220, useNativeDriver: true }),
                ]).start();
                Animated.timing(bookmarkBurst, {
                  toValue: 0,
                  duration: 120,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }).start();
                onBookmarkPress();
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Add bookmark'}>
              <View style={styles.bookmarkWrap}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.bookmarkBurst,
                    {
                      opacity: bookmarkBurst,
                      transform: [
                        {
                          scale: bookmarkBurst.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 1.4],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                  <MaterialIcons
                    name={bookmarked ? 'bookmark' : 'bookmark-border'}
                    size={22}
                    color={bookmarked ? accent : textSecondary}
                  />
                </Animated.View>
              </View>
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.meta, { color: textMuted }]} numberOfLines={description ? 2 : 1}>
          {description?.trim() ? description : meta}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={[styles.price, { color: priceColor }]} numberOfLines={1}>
            {normalizeRupeeLabel(effectivePriceLabel)}
          </Text>
          {effectiveShowBadge ? (
            <View style={styles.inlinePremiumBadge}>
              <MaterialIcons name="workspace-premium" size={13} color="#FFE4EC" />
            </View>
          ) : (
            <View style={styles.inlinePremiumSpacer} />
          )}
          <View style={styles.rating}>
            <MaterialIcons name="star" size={15} color={iconSecondary} />
            <Text style={[styles.ratingText, { color: textPrimary }]}>{rating.toFixed(1)}</Text>
          </View>
        </View>
        {progressPercent != null && (
          <View style={[styles.progressTrack, { backgroundColor: surfaceAlt }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, progressPercent))}%`, backgroundColor: iconSecondary },
              ]}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1A1027',
    borderRadius: 15,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#322147',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  cardPressed: {
    opacity: 0.9,
  },
  thumb: {
    width: 118,
    minHeight: 110,
    alignSelf: 'stretch',
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    backgroundColor: '#2A1E3C',
  },
  body: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingRight: 10,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
    marginTop: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  inlinePremiumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(92, 20, 44, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(236, 191, 204, 0.9)',
  },
  inlinePremiumSpacer: {
    width: 22,
    height: 22,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 46,
    justifyContent: 'flex-end',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderRadius: 4,
    backgroundColor: '#2A1E3C',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  bookmarkWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkBurst: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(192,198,207,0.25)',
  },
});
