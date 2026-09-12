import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackNavButton } from '@/components/navigation/back-nav-button';

import { VideoRowCard } from '@/components/video/video-row-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCatalog } from '@/providers/catalog-provider';
import { useLibrary } from '@/providers/library-provider';
import { usePurchase } from '@/providers/purchase-provider';

export default function BookmarksScreen() {
  const { allVideos, videosByCategory, categoryThumbnailUrlByName, getCategoryPackTotalPrice, videoAccessByTitle, isInCategoryPack } = useCatalog();
  const { bookmarks, categoryBookmarks, toggleBookmark, toggleCategoryBookmark, refreshAll } = useLibrary();
  const { hasCategoryAccess, hasVideoAccess } = usePurchase();
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');
  const accentSoft = useThemeColor({}, 'appAccentSoft');

  const saved = useMemo(() => {
    const map = new Map(allVideos.map((video) => [video.title, video]));
    return bookmarks.map((title) => map.get(title)).filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [allVideos, bookmarks]);

  const savedCategories = useMemo(() => {
    return categoryBookmarks
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
  }, [categoryBookmarks, videosByCategory, hasCategoryAccess, getCategoryPackTotalPrice, categoryThumbnailUrlByName]);

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  const countLabel = useMemo(() => {
    const total = saved.length + savedCategories.length;
    return total === 1 ? '1 bookmark saved' : `${total} bookmarks saved`;
  }, [saved.length, savedCategories.length]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackNavButton onPress={() => router.back()} />
        </View>
        <View style={styles.hero}>
          <View style={styles.heroIconRing}>
            <MaterialIcons name="bookmark" size={32} color={accent} />
          </View>
          <Text style={[styles.pageTitle, { color: textPrimary }]}>Bookmarks</Text>
          <Text style={[styles.pageSub, { color: textMuted }]}>
            Pick up where you left off — your saved lessons stay here until you remove them.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryPill, { backgroundColor: cardBg, borderColor: border }]}>
            <MaterialIcons name="video-library" size={18} color={textSecondary} />
            <Text style={[styles.summaryText, { color: textSecondary }]}>{countLabel}</Text>
          </View>
        </View>

        {saved.length === 0 && savedCategories.length === 0 ? (
          <View style={[styles.emptyWrap, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={[styles.emptyIconCircle, { borderColor: border, backgroundColor: accentSoft }]}>
              <MaterialIcons name="bookmark-border" size={44} color={textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Nothing saved yet</Text>
            <Text style={[styles.emptyBody, { color: textMuted }]}>Tap bookmark on videos or categories to add them here.</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/explore')}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
              <Text style={styles.ctaText}>Browse categories</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#1F2933" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.listSection}>
            {savedCategories.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, { color: textPrimary }]}>Saved categories</Text>
                {savedCategories.map((item) => (
                  <VideoRowCard
                    key={`category-${item.name}`}
                    thumbnail={item.thumbnail}
                    title={item.name}
                    meta={`${item.count} videos`}
                    priceLabel={item.priceLabel}
                    showPremiumBadge={!item.isPurchased && item.priceLabel !== 'FREE'}
                    rating={item.rating}
                    bookmarked
                    onBookmarkPress={() => {
                      void toggleCategoryBookmark(item.name);
                    }}
                    onPress={() => router.push(`/category/${encodeURIComponent(item.name)}`)}
                  />
                ))}
              </>
            ) : null}

            {saved.length > 0 ? <Text style={[styles.sectionLabel, { color: textPrimary }]}>Saved videos</Text> : null}
            {saved.map((item) => {
              const meta = videoAccessByTitle[item.title];
              const isUnlocked = hasVideoAccess(item.title, { 
                category: meta?.category, 
                isFree: meta?.isFree 
              });
              const displayPrice = isUnlocked ? 'UNLOCKED' : (item.individualPriceLabel ?? item.priceLabel);
              const showBadge = !isUnlocked && !meta?.isFree;

              return (
                <VideoRowCard
                  key={item.title}
                  thumbnail={item.thumbnail}
                  title={item.title}
                  subtitle={item.subtitle}
                  meta={item.meta}
                  description={item.description}
                  priceLabel={displayPrice}
                  showPremiumBadge={showBadge}
                  rating={item.rating}
                  bookmarked
                  onBookmarkPress={() => {
                    void toggleBookmark(item.title);
                  }}
                  onPress={() => router.push(`/video/${encodeURIComponent(item.title)}`)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 18,
  },
  heroIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#C0C6CF',
    backgroundColor: '#1A1027',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  pageSub: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 340,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  listSection: {
    marginTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 300,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#C0C6CF',
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '800',
  },
});
