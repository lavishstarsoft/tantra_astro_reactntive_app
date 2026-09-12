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
import { useAppColorScheme } from '@/providers/color-scheme-provider';

type CategoriesContentProps = {
  /** Hide back when shown as a bottom tab (Learn). */
  variant: 'stack' | 'tab';
};

export function CategoriesContent({ variant }: CategoriesContentProps) {
  const showBack = variant === 'stack';
  const { colorScheme } = useAppColorScheme();
  const { videosByCategory, categoryThumbnailUrlByName, getCategoryPackTotalPrice } = useCatalog();
  const { categoryBookmarks, toggleCategoryBookmark } = useLibrary();
  const { hasCategoryAccess } = usePurchase();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');

  const categoryRows = useMemo(() => {
    return Object.entries(videosByCategory)
      .filter(([name]) => name !== 'General' && (!query || name.toLowerCase().includes(query)))
      .map(([name, list]) => {
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
          price: isPurchased ? 'UNLOCKED' : (price || 'FREE'),
          isPurchased,
        };
      });
  }, [videosByCategory, query, hasCategoryAccess, getCategoryPackTotalPrice, categoryThumbnailUrlByName]);
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appBg }]}
      edges={showBack ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackNavButton onPress={() => router.back()} accessibilityLabel="Back" />
          <Text style={[styles.title, { color: textPrimary }]}>All Categories</Text>
          <View style={styles.headerSide} />
        </View>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search categories..."
          placeholderTextColor={textMuted}
          style={[styles.searchInput, { borderColor: border, backgroundColor: cardBg, color: textPrimary }]}
        />

        {categoryRows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateTitle, { color: textPrimary }]}>There is no category</Text>
            <Text style={[styles.emptyStateSubtitle, { color: textMuted }]}>
              {query ? 'Try a different search term.' : 'Check back later for new categories.'}
            </Text>
          </View>
        ) : (
          categoryRows.map((category) => (
            <Pressable
              key={category.name}
              onPress={() => router.push(`/category/${encodeURIComponent(category.name)}`)}>
              <VideoRowCard
                thumbnail={category.thumbnail}
                title={category.name}
                subtitle="Astrology learning track"
                meta={`${category.count.toLocaleString()} videos`}
                priceLabel={category.price}
                showPremiumBadge={!category.isPurchased && category.price !== 'FREE'}
                rating={category.rating}
                bookmarked={categoryBookmarks.includes(category.name)}
                onBookmarkPress={() => {
                  void toggleCategoryBookmark(category.name);
                }}
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
    marginBottom: 16,
  },
  headerSide: {
    width: 36,
    height: 36,
  },
  title: { fontSize: 20, fontWeight: '800' },
  searchInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
