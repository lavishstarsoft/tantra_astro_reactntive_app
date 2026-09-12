import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackNavButton } from '@/components/navigation/back-nav-button';
import { VideoRowCard } from '@/components/video/video-row-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCatalog } from '@/providers/catalog-provider';
import { useLibrary } from '@/providers/library-provider';
import { usePurchase } from '@/providers/purchase-provider';

export default function IndividualVideosScreen() {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const { allVideos, videoAccessByTitle, isInCategoryPack } = useCatalog();
  const { hasVideoAccess } = usePurchase();
  const { bookmarks, toggleBookmark } = useLibrary();

  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');

  const rows = useMemo(() => {
    const base = allVideos.filter((v) => !isInCategoryPack(v.title));
    if (!query) return base;
    return base.filter((v) =>
      [v.title, v.subtitle, v.meta].some((s) => (s ?? '').toLowerCase().includes(query))
    );
  }, [allVideos, isInCategoryPack, query]);

  const getAccessLabel = (title: string, fallback: string) => {
    const meta = videoAccessByTitle[title];
    if (!meta) return fallback;
    if (meta.isFree) return 'FREE';
    if (hasVideoAccess(title, { category: meta.category, isFree: meta.isFree })) return 'UNLOCKED';
    if (isInCategoryPack(title) && !meta.isFree) return 'Pack only';
    return 'Buy Video';
  };
  const shouldShowPremiumBadge = (title: string) => {
    const meta = videoAccessByTitle[title];
    if (!meta || meta.isFree) return false;
    return !hasVideoAccess(title, { category: meta.category, isFree: meta.isFree });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackNavButton onPress={() => router.back()} accessibilityLabel="Back" />
          <Text style={[styles.title, { color: textPrimary }]}>Individual Videos</Text>
          <View style={styles.headerSpacer} />
        </View>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search individual videos..."
          placeholderTextColor={textMuted}
          style={[styles.searchInput, { borderColor: border, backgroundColor: cardBg, color: textPrimary }]}
        />

        {rows.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.emptyText, { color: textSecondary }]}>No individual videos found.</Text>
          </View>
        ) : (
          rows.map((video) => (
            <Pressable key={video.title} onPress={() => router.push(`/video/${encodeURIComponent(video.title)}`)}>
              <VideoRowCard
                thumbnail={video.thumbnail}
                title={video.title}
                subtitle={video.subtitle}
                meta={video.meta}
                description={video.description}
                showPremiumBadge={shouldShowPremiumBadge(video.title)}
                priceLabel={getAccessLabel(video.title, video.individualPriceLabel ?? video.priceLabel)}
                rating={video.rating}
                bookmarked={bookmarks.includes(video.title)}
                onBookmarkPress={() => {
                  void toggleBookmark(video.title);
                }}
                onPress={() => router.push(`/video/${encodeURIComponent(video.title)}`)}
              />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 19, fontWeight: '800' },
  headerSpacer: { width: 36 },
  searchInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 14,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

