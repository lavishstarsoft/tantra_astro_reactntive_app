import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackNavButton } from '@/components/navigation/back-nav-button';
import { VideoRowCard } from '@/components/video/video-row-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCatalog } from '@/providers/catalog-provider';
import { useLibrary } from '@/providers/library-provider';
import { usePurchase } from '@/providers/purchase-provider';
import { isCompAccount } from '@/lib/comp-account';

function normalizeRupeeLabel(input: string): string {
  const text = input.trim();
  if (!text) return input;
  if (text.includes('₹')) return text;
  if (/^\d+(?:\.\d+)?$/.test(text)) return `₹${text}`;
  return text;
}

function normalizeUiPrice(input: string): string {
  const text = input.trim();
  if (!text) return 'Buy Video';
  return text;
}

export default function CategoryDetailsScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const categoryName = name ? decodeURIComponent(name) : 'Category';
  const { videosByCategory, videoAccessByTitle, getCategoryPackTotalPrice, getCategoryValidity, isInCategoryPack } = useCatalog();
  const videos = videosByCategory[categoryName] ?? [];
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');
  const { purchaseCategory, hasCategoryAccess, hasVideoAccess } = usePurchase();
  const { bookmarks, toggleBookmark } = useLibrary();
  const categoryPurchased = hasCategoryAccess(categoryName);
  const packTotal = getCategoryPackTotalPrice(categoryName);
  const validityDays = getCategoryValidity(categoryName);
  const validityLabel = validityDays > 0 ? `Validity: ${validityDays} days` : 'Validity: Lifetime access';

  const getVideoPriceLabel = (title: string, fallback: string) => {
    const meta = videoAccessByTitle[title];
    if (!meta) return normalizeUiPrice(fallback);
    if (meta.isFree) return 'FREE';
    if (hasVideoAccess(title, { category: meta.category, isFree: meta.isFree })) {
      return categoryPurchased ? 'Included in category' : 'UNLOCKED';
    }
    if (isInCategoryPack(title) && !meta.isFree) return 'Pack only';
    return 'Buy Video';
  };

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackNavButton onPress={onBack} accessibilityLabel="Back" />
          <Text style={[styles.title, { color: textPrimary }]}>{categoryName} Videos</Text>
          <View style={styles.headerSpacer} />
        </View>
        {isCompAccount() || Platform.OS === 'ios' ? null : (
          <View style={[styles.purchaseBanner, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.purchaseContent}>
              <Text style={[styles.purchaseTitle, { color: textPrimary }]}>{categoryName} Pack</Text>
              <Text style={[styles.purchaseSubtitle, { color: textMuted }]}>
                {categoryPurchased
                  ? 'You can watch all paid videos in this category.'
                  : `Buy this category to unlock all paid videos in this pack.${packTotal ? ` Total ${normalizeRupeeLabel(packTotal)}.` : ''} ${validityLabel}.`}
              </Text>
            </View>
            <Pressable
              style={[styles.purchaseButton, { backgroundColor: categoryPurchased ? cardBg : accent, borderColor: border }]}
              onPress={() => purchaseCategory(categoryName)}
              disabled={categoryPurchased}>
              <Text style={[styles.purchaseButtonText, { color: categoryPurchased ? textSecondary : '#FFFFFF' }]}>
                {categoryPurchased ? 'UNLOCKED' : packTotal ? `Buy · ${normalizeRupeeLabel(packTotal)}` : 'Buy Category'}
              </Text>
            </Pressable>
          </View>
        )}

        {videos.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: border }]}>
            <Text style={[styles.emptyText, { color: textMuted }]}>
              No videos in this category yet.
            </Text>
          </View>
        ) : (
          videos.map((video) => (
            <VideoRowCard
              key={video.title}
              thumbnail={video.thumbnail}
              title={video.title}
              subtitle={video.subtitle}
              meta={video.meta}
              priceLabel={getVideoPriceLabel(video.title, video.priceLabel)}
              rating={video.rating}
              bookmarked={bookmarks.includes(video.title)}
              onBookmarkPress={() => {
                void toggleBookmark(video.title);
              }}
              onPress={() => router.push(`/video/${encodeURIComponent(video.title)}`)}
            />
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
  title: { fontSize: 19, fontWeight: '800' },
  headerSpacer: { width: 36 },
  purchaseBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  purchaseContent: {
    flex: 1,
  },
  purchaseTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  purchaseSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
  },
  purchaseButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  purchaseButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
