import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { BackNavButton } from '@/components/navigation/back-nav-button';
import { VideoRowCard } from '@/components/video/video-row-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCatalog } from '@/providers/catalog-provider';
import { useLibrary } from '@/providers/library-provider';
import { usePurchase } from '@/providers/purchase-provider';

export default function SearchScreen() {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  
  const { 
    allVideos, 
    videosByCategory, 
    videoAccessByTitle, 
    isInCategoryPack,
    categoryThumbnailUrlByName,
    getCategoryPackTotalPrice
  } = useCatalog();
  
  const { hasVideoAccess, hasCategoryAccess } = usePurchase();
  const { bookmarks, categoryBookmarks, toggleBookmark, toggleCategoryBookmark } = useLibrary();

  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');

  const filteredVideos = useMemo(() => {
    if (!query) return [];
    return allVideos.filter((v) =>
      [v.title, v.subtitle, v.meta].some((s) => (s ?? '').toLowerCase().includes(query))
    );
  }, [allVideos, query]);

  const filteredCategories = useMemo(() => {
    if (!query) return [];
    return Object.keys(videosByCategory)
      .filter((name) => name !== 'General' && name.toLowerCase().includes(query))
      .map((name) => {
        const list = videosByCategory[name] ?? [];
        const isPurchased = hasCategoryAccess(name);
        const price = getCategoryPackTotalPrice(name);
        const thumbUrl = categoryThumbnailUrlByName[name];
        
        return {
          name,
          count: list.length,
          thumbnail: thumbUrl 
            ? ({ uri: thumbUrl } as any)
            : (list[0]?.thumbnail ?? require('@/assets/images/video-thumb-cosmic-1.jpg')),
          rating: list[0]?.rating ?? 4.5,
          priceLabel: isPurchased ? 'UNLOCKED' : (price || 'FREE'),
          isPurchased,
        };
      });
  }, [videosByCategory, query, hasCategoryAccess, getCategoryPackTotalPrice, categoryThumbnailUrlByName]);

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
      <View style={styles.header}>
        <BackNavButton onPress={() => router.back()} accessibilityLabel="Back" />
        <View style={[styles.searchContainer, { borderColor: border, backgroundColor: cardBg }]}>
          <MaterialIcons name="search" size={20} color={textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search videos, categories..."
            placeholderTextColor={textMuted}
            autoFocus
            style={[styles.searchInput, { color: textPrimary }]}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')}>
              <MaterialIcons name="close" size={20} color={textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!query ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search" size={64} color={border} />
            <Text style={[styles.emptyText, { color: textMuted }]}>Type to search videos and categories</Text>
          </View>
        ) : filteredVideos.length === 0 && filteredCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="sentiment-dissatisfied" size={64} color={border} />
            <Text style={[styles.emptyText, { color: textMuted }]}>No results found for "{q}"</Text>
          </View>
        ) : (
          <>
            {filteredCategories.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Categories</Text>
                {filteredCategories.map((cat) => (
                  <Pressable key={cat.name} onPress={() => router.push(`/category/${encodeURIComponent(cat.name)}`)}>
                    <VideoRowCard
                      thumbnail={cat.thumbnail}
                      title={cat.name}
                      subtitle="Astrology learning track"
                      meta={`${cat.count} videos`}
                      priceLabel={cat.priceLabel}
                      showPremiumBadge={!cat.isPurchased && cat.priceLabel !== 'FREE'}
                      rating={cat.rating}
                      bookmarked={categoryBookmarks.includes(cat.name)}
                      onBookmarkPress={() => toggleCategoryBookmark(cat.name)}
                    />
                  </Pressable>
                ))}
              </View>
            )}

            {filteredVideos.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Videos</Text>
                {filteredVideos.map((video) => (
                  <VideoRowCard
                    key={video.title}
                    thumbnail={video.thumbnail}
                    title={video.title}
                    subtitle={video.subtitle}
                    meta={video.meta}
                    description={video.description}
                    showPremiumBadge={shouldShowPremiumBadge(video.title)}
                    priceLabel={getAccessLabel(video.title, video.individualPriceLabel ?? video.priceLabel)}
                    rating={video.rating}
                    bookmarked={bookmarks.includes(video.title)}
                    onBookmarkPress={() => toggleBookmark(video.title)}
                    onPress={() => router.push(`/video/${encodeURIComponent(video.title)}`)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  content: { padding: 16, paddingBottom: 30 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  emptyState: {
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
