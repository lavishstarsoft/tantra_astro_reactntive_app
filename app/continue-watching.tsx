import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VideoRowCard } from '@/components/video/video-row-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWatchProgressMap } from '@/hooks/use-watch-progress-map';
import { useCatalog } from '@/providers/catalog-provider';
import { useLibrary } from '@/providers/library-provider';
import { usePurchase } from '@/providers/purchase-provider';

export default function ContinueWatchingScreen() {
  const { allVideos, videoAccessByTitle, isInCategoryPack } = useCatalog();
  const { progressForTitle } = useWatchProgressMap();
  const { bookmarks, toggleBookmark } = useLibrary();
  const { hasVideoAccess } = usePurchase();

  const appBg = useThemeColor({}, 'appBg');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const border = useThemeColor({}, 'appBorder');

  const continueWatching = useMemo(() => {
    return allVideos
      .map((v) => ({ video: v, progressPercent: progressForTitle(v.title) }))
      .filter((row) => (row.progressPercent ?? 0) > 0)
      .sort((a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0));
  }, [allVideos, progressForTitle]);

  const normalizeUiPrice = (label?: string) => {
    const text = (label ?? '').trim();
    if (!text) return 'Buy Video';
    return text;
  };

  const getAccessLabel = (title: string, fallback: string) => {
    const meta = videoAccessByTitle[title];
    if (!meta) return normalizeUiPrice(fallback);
    if (meta.isFree) return 'FREE';
    if (hasVideoAccess(title, { category: meta.category, isFree: meta.isFree })) return 'UNLOCKED';
    if (isInCategoryPack(title) && !meta.isFree) return 'Pack only';
    return 'Buy Video';
  };

  const openVideoDetails = (title: string) => {
    router.push(`/video/${encodeURIComponent(title)}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Continue Watching</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {continueWatching.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="play-circle-outline" size={64} color={textMuted} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>No videos in progress</Text>
          </View>
        ) : (
          continueWatching.map(({ video, progressPercent }) => (
            <VideoRowCard
              key={video.title}
              thumbnail={video.thumbnail}
              title={video.title}
              subtitle={video.subtitle}
              meta={video.meta}
              description={video.description}
              priceLabel={getAccessLabel(video.title, video.priceLabel)}
              rating={video.rating}
              progressPercent={progressPercent ?? undefined}
              bookmarked={bookmarks.includes(video.title)}
              onBookmarkPress={() => {
                void toggleBookmark(video.title);
              }}
              onPress={() => openVideoDetails(video.title)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
});
