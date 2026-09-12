import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VideoRowCard } from '@/components/video/video-row-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWatchProgressMap } from '@/hooks/use-watch-progress-map';
import { extractImageUri, toProxyImageUrl } from '@/lib/image-fallback';
import { useCatalog } from '@/providers/catalog-provider';
import { useAppColorScheme } from '@/providers/color-scheme-provider';
import { useNotifications } from '@/providers/notification-provider';
import { usePurchase } from '@/providers/purchase-provider';
import { useLibrary } from '@/providers/library-provider';
import { isCompAccount } from '@/lib/comp-account';

function CarouselImage({
  source,
  style,
}: {
  source: unknown;
  style: object;
}) {
  const [resolved, setResolved] = useState(source);

  useEffect(() => {
    setResolved(source);
  }, [source]);

  return (
    <Image
      source={resolved as never}
      style={style}
      contentFit="cover"
      onError={() => {
        const uri = extractImageUri(resolved as never);
        if (!uri) return;
        const proxy = toProxyImageUrl(uri);
        if (!proxy) return;
        // Defer fallback source change out of image error callback to avoid Glide IllegalStateException on Android.
        setTimeout(() => setResolved({ uri: proxy }), 0);
      }}
    />
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const carouselCardWidth = Math.max(width - 36, 280);
  const carouselRef = useRef<ScrollView>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const { colorScheme, setPreference } = useAppColorScheme();
  const { hasVideoAccess, hasCategoryAccess } = usePurchase();
  const { unreadCount } = useNotifications();
  const { bookmarks, toggleBookmark, categoryBookmarks, toggleCategoryBookmark } = useLibrary();
  const { progressForTitle } = useWatchProgressMap();
  const {
    allVideos,
    carouselItems,
    homeConfig,
    videosByCategory,
    categoryThumbnailUrlByName,
    videoAccessByTitle,
    isInCategoryPack,
    upcomingItems,
    isLoading,
    refresh: refreshCatalog,
    getCategoryPackTotalPrice,
  } = useCatalog();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshCatalog();
    setIsRefreshing(false);
  }, [refreshCatalog]);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch = useCallback(
    (...parts: string[]) => !normalizedQuery || parts.some((part) => part.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery]
  );
  const categories = useMemo(() => {
    const entries = Object.entries(videosByCategory)
      .filter(([name]) => name !== 'General')
      .map(([name, list]) => {
        const isPurchased = hasCategoryAccess(name);
        const hasPremiumVideos = list.some((video) => video.priceLabel !== 'FREE');
        const hasLockedPremium = !isPurchased && hasPremiumVideos;
        return {
          name,
          count: list.length,
          thumbnail: categoryThumbnailUrlByName[name]
            ? ({ uri: categoryThumbnailUrlByName[name] } as const)
            : (list[0]?.thumbnail ?? require('@/assets/images/video-thumb-cosmic-1.jpg')),
          hasLockedPremium,
          price: getCategoryPackTotalPrice(name),
          isPurchased,
        };
      });
    const selected = homeConfig.featuredCategories ?? [];
    if (selected.length === 0) {
      return entries;
    }
    const orderMap = new Map(selected.map((name, i) => [name, i]));
    return entries
      .filter((entry) => orderMap.has(entry.name))
      .sort((a, b) => (orderMap.get(a.name) ?? 999) - (orderMap.get(b.name) ?? 999));
  }, [categoryThumbnailUrlByName, hasVideoAccess, hasCategoryAccess, getCategoryPackTotalPrice, homeConfig.featuredCategories, videoAccessByTitle, videosByCategory]);
  const individualVideos = allVideos
    .filter((v) => !isInCategoryPack(v.title))
    .filter((v) => matchesSearch(v.title, v.subtitle, v.meta));
  const videoByTitle = useMemo(() => new Map(allVideos.map((v) => [v.title, v])), [allVideos]);
  const selectedCategorySections = useMemo(() => {
    const selected = (homeConfig.featuredCategories ?? []).filter((n) => n !== 'General');
    return selected
      .map((categoryName) => {
        const rows = videosByCategory[categoryName] ?? [];
        const videos = rows
          .map((row) => videoByTitle.get(row.title))
          .filter((video): video is NonNullable<typeof video> => Boolean(video))
          .filter((video) => matchesSearch(video.title, video.subtitle, video.meta));
        return { categoryName, videos };
      })
      .filter((section) => section.videos.length > 0);
  }, [homeConfig.featuredCategories, matchesSearch, videoByTitle, videosByCategory]);

  const carouselVideos = useMemo(() => {
    if (carouselItems.length > 0) {
      return carouselItems.slice(0, 6).map((c) => ({
        title: c.title,
        subtitle: c.subtitle ?? '',
        thumbnail: { uri: c.imageUrl } as any,
        kind: c.kind,
        target: c.target,
      }));
    }
    const list = allVideos.filter((v) => matchesSearch(v.title, v.subtitle, v.meta));
    return list.slice(0, 3).map((v) => ({
      title: v.title,
      subtitle: v.subtitle,
      thumbnail: v.thumbnail,
      kind: 'video' as const,
      target: v.title,
    }));
  }, [allVideos, carouselItems, matchesSearch]);

  const onCarouselPress = (item: { kind: string; target: string }) => {
    if (item.kind === 'video' && item.target) {
      openVideoDetails(item.target);
      return;
    }
    if (item.kind === 'category' && item.target) {
      router.push(`/category/${encodeURIComponent(item.target)}`);
      return;
    }
    if (item.kind === 'url' && item.target) {
      void Linking.openURL(item.target);
      return;
    }
  };

  const continueWatching = useMemo(() => {
    const list = allVideos
      .map((v) => ({ video: v, progressPercent: progressForTitle(v.title) }))
      .filter((row) => (row.progressPercent ?? 0) > 0)
      .sort((a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0))
      .slice(0, 3);
    return list;
  }, [allVideos, progressForTitle]);

  const upcomingLike = useMemo(() => {
    const watchedSet = new Set(continueWatching.map((r) => r.video.title));
    const selectedTitles = homeConfig.recommendedVideoTitles ?? [];
    if (selectedTitles.length > 0) {
      const byTitle = new Map(allVideos.map((v) => [v.title, v]));
      return selectedTitles
        .map((title) => byTitle.get(title))
        .filter((video): video is NonNullable<typeof video> => Boolean(video))
        .filter((v) => matchesSearch(v.title, v.subtitle, v.meta))
        .slice(0, 20);
    }
    return allVideos
      .filter((v) => !watchedSet.has(v.title))
      .filter((v) => matchesSearch(v.title, v.subtitle, v.meta))
      .slice(0, 6);
  }, [allVideos, continueWatching, homeConfig.recommendedVideoTitles, matchesSearch]);

  const menuAnim = useRef(new Animated.Value(0)).current;
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');
  const dotIdle = useThemeColor({ light: 'rgba(110, 123, 143, 0.35)', dark: 'rgba(192, 198, 207, 0.35)' }, 'appTextMuted');
  const dotActive = useThemeColor({}, 'appTabIconActive');
  const carouselOverlay = useThemeColor({ light: 'rgba(26, 34, 48, 0.45)', dark: 'rgba(0,0,0,0.55)' }, 'appSurfaceAlt');
  const menuOverlay = useThemeColor({ light: 'rgba(26, 34, 48, 0.4)', dark: 'rgba(0, 0, 0, 0.55)' }, 'appSurfaceAlt');
  const openVideoDetails = (title: string) => {
    router.push(`/video/${encodeURIComponent(title)}` as any);
  };
  const normalizeUiPrice = (label?: string) => {
    const text = (label ?? '').trim();
    if (!text) return 'Buy Video';
    return text;
  };
  const normalizeCostLabel = (label?: string) => {
    const text = (label ?? '').trim();
    if (!text) return '';
    if (text.includes('₹')) return text;
    if (/^\d+(?:\.\d+)?$/.test(text)) return `₹${text}`;
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
  const shouldShowPremiumBadge = (title: string) => {
    if (isCompAccount()) return false;
    const meta = videoAccessByTitle[title];
    if (!meta || meta.isFree) return false;
    return !hasVideoAccess(title, { category: meta.category, isFree: meta.isFree });
  };

  const openMenu = () => {
    if (isMenuVisible) return;
    setIsMenuVisible(true);
    Animated.timing(menuAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMenuVisible(false);
      }
    });
  };

  const backdropOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuTranslateX = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0],
  });

  const menuScale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });

  const menuItems: { key: string; label: string; icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void }[] = [
    { key: 'home', label: 'Home', icon: 'home', onPress: closeMenu },
    {
      key: 'my-learning',
      label: 'My Learning',
      icon: 'school',
      onPress: () => {
        closeMenu();
        router.push('/(tabs)/my-learning');
      },
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: 'account-circle',
      onPress: () => {
        closeMenu();
        router.push('/(tabs)/profile');
      },
    },
    {
      key: 'categories',
      label: 'All Categories',
      icon: 'view-list',
      onPress: () => {
        closeMenu();
        router.push('/categories');
      },
    },
    {
      key: 'theme',
      label: colorScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: colorScheme === 'dark' ? 'light-mode' : 'dark-mode',
      onPress: () => {
        setPreference(colorScheme === 'dark' ? 'light' : 'dark');
        closeMenu();
      },
    },
  ];

  useEffect(() => {
    if (carouselVideos.length <= 1) return;
    const id = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = (prev + 1) % carouselVideos.length;
        carouselRef.current?.scrollTo({ x: next * carouselCardWidth, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [carouselVideos.length, carouselCardWidth]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={[styles.skeletonCircle, { backgroundColor: cardBg, borderColor: border }]} />
            <View style={[styles.skeletonLogo, { backgroundColor: cardBg, borderColor: border }]} />
            <View style={[styles.skeletonCircle, { backgroundColor: cardBg, borderColor: border }]} />
          </View>
          <View style={[styles.skeletonSearch, { backgroundColor: cardBg, borderColor: border }]} />
          <View style={[styles.skeletonCarousel, { backgroundColor: cardBg, borderColor: border }]} />
          <View style={[styles.sectionHeader, { marginTop: 14 }]}>
            <View style={[styles.skeletonLineLg, { backgroundColor: cardBg }]} />
            <View style={[styles.skeletonLineSm, { backgroundColor: cardBg }]} />
          </View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor: border }]} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
      <Modal
        visible={isMenuVisible}
        transparent
        statusBarTranslucent
        onRequestClose={closeMenu}>
        <View style={styles.menuOverlayContainer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
            <Animated.View
              style={[styles.menuBackdrop, { backgroundColor: menuOverlay, opacity: backdropOpacity }]}
            />
          </Pressable>
          <Animated.View
            style={[
              styles.menuSheet,
              {
                backgroundColor: cardBg,
                borderColor: border,
                transform: [{ translateX: menuTranslateX }, { scale: menuScale }],
              },
            ]}>
            <Text style={[styles.menuTitle, { color: textPrimary }]}>Menu</Text>
            {menuItems.map((item, index) => (
              <View key={item.key}>
                <Pressable
                  onPress={item.onPress}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                  <MaterialIcons name={item.icon} size={20} color={textSecondary} />
                  <Text style={[styles.menuItemText, { color: textPrimary }]}>{item.label}</Text>
                </Pressable>
                {index < menuItems.length - 1 ? (
                  <View style={[styles.menuItemDivider, { backgroundColor: border }]} />
                ) : null}
              </View>
            ))}
          </Animated.View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[accent]}
            tintColor={accent}
          />
        }>
        <View style={styles.headerRow}>
          <Pressable
            onPress={openMenu}
            style={[styles.headerIconWrap, { backgroundColor: cardBg, borderColor: border }]}
            accessibilityRole="button"
            accessibilityLabel="Open menu">
            <Text style={[styles.headerIcon, { color: textSecondary }]}>☰</Text>
          </Pressable>
          <Image
            source={require('@/assets/images/auth-logo-circle.png')}
            style={[styles.headerLogo, { borderColor: border, backgroundColor: cardBg }]}
            contentFit="cover"
          />
          <Pressable
            onPress={() => router.push('/notifications' as any)}
            style={[styles.headerIconWrap, { backgroundColor: cardBg, borderColor: border, position: 'relative' }]}>
            <MaterialIcons name="notifications-none" size={20} color={textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/search' as any)}
          style={[styles.searchTrigger, { borderColor: border, backgroundColor: cardBg }]}>
          <MaterialIcons name="search" size={20} color={textMuted} style={{ marginRight: 10 }} />
          <Text style={[styles.searchTriggerText, { color: textMuted }]}>
            Search videos, categories...
          </Text>
        </Pressable>

        <View style={styles.carouselWrapper}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / carouselCardWidth);
              setCarouselIndex(Math.max(0, Math.min(next, Math.max(0, carouselVideos.length - 1))));
            }}>
            {carouselVideos.map((item) => (
              <View
                key={item.title}
                style={[styles.carouselCard, { width: carouselCardWidth, borderColor: border, backgroundColor: cardBg }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => onCarouselPress(item)} />
                <CarouselImage source={item.thumbnail} style={styles.carouselThumb} />
                <View style={[styles.carouselWatchIcon, { backgroundColor: carouselOverlay }]}>
                  <Text style={styles.carouselWatchIconText}>▶</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.carouselDotsRow}>
            {carouselVideos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.carouselDot,
                  { backgroundColor: dotIdle },
                  i === carouselIndex && [styles.carouselDotActive, { backgroundColor: dotActive }],
                ]}
              />
            ))}
          </View>
        </View>

        {homeConfig.showContinueWatching && continueWatching.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Continue Watching</Text>
              <Pressable onPress={() => router.push('/continue-watching' as any)}>
                <Text style={[styles.sectionLink, { color: textSecondary }]}>Resume</Text>
              </Pressable>
            </View>
            {continueWatching.map(({ video, progressPercent }) => (
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
            ))}
          </>
        ) : null}

        {categories.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Categories</Text>
              <Pressable onPress={() => router.push('/categories' as any)}>
                <Text style={[styles.sectionLink, { color: textSecondary }]}>Browse</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categorySlideRow}>
              {categories
                .filter((category) => matchesSearch(category.name))
                .map((category) => (
                  <Pressable
                    key={category.name}
                    style={[styles.categorySlideCard, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => router.push(`/category/${encodeURIComponent(category.name)}` as any)}>
                    <View style={styles.individualThumbWrap}>
                      <Image source={category.thumbnail} style={styles.categoryThumbLarge} contentFit="cover" />
                      {category.hasLockedPremium ? (
                        <View style={styles.individualPremiumBadge}>
                          <MaterialIcons name="workspace-premium" size={16} color="#FFE4EC" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.videoTitle, { color: accent }]}>{category.name}</Text>
                    <View style={styles.categoryMetaRow}>
                      <Text style={[styles.videoMeta, styles.categoryMetaText, { color: textMuted, flex: 1 }]} numberOfLines={1}>
                        {`Videos: ${category.count}`}
                      </Text>
                      
                      <View style={[styles.categoryPriceRow, { flex: 1.5, justifyContent: 'center' }]}>
                        <Text style={[styles.categoryPriceText, { color: category.isPurchased ? (colorScheme === 'dark' ? '#FFFFFF' : '#800000') : textPrimary }]} numberOfLines={1}>
                          {isCompAccount() ? '' : category.isPurchased ? 'UNLOCKED' : (category.price || 'FREE')}
                        </Text>
                        {category.hasLockedPremium && !category.isPurchased && (
                          <View style={styles.inlinePremiumBadgeSmall}>
                            <MaterialIcons name="workspace-premium" size={10} color="#FFE4EC" />
                          </View>
                        )}
                      </View>

                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          void toggleCategoryBookmark(category.name);
                        }}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={categoryBookmarks.includes(category.name) ? 'Remove bookmark' : 'Add bookmark'}
                        style={styles.categoryBookmarkButton}>
                        <MaterialIcons
                          name={categoryBookmarks.includes(category.name) ? 'bookmark' : 'bookmark-border'}
                          size={20}
                          color={categoryBookmarks.includes(category.name) ? accent : textSecondary}
                        />
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
            </ScrollView>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Individual Videos</Text>
          <Pressable onPress={() => router.push('/individual-videos' as any)}>
            <Text style={[styles.sectionLink, { color: textSecondary }]}>Browse</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categorySlideRow}>
          {individualVideos.length === 0 ? (
            <View style={[styles.categorySlideCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.videoMeta, { color: textMuted }]}>No individual videos available.</Text>
            </View>
          ) : (
            individualVideos.slice(0, 12).map((video) => (
              <Pressable
                key={video.title}
                style={[styles.categorySlideCard, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => openVideoDetails(video.title)}>
                <View style={styles.individualThumbWrap}>
                  <Image source={video.thumbnail} style={styles.categoryThumbLarge} contentFit="cover" />
                  {shouldShowPremiumBadge(video.title) ? (
                    <View style={styles.individualPremiumBadge}>
                      <MaterialIcons name="workspace-premium" size={16} color="#FFE4EC" />
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.videoTitle, { color: accent }]} numberOfLines={1}>
                  {video.title}
                </Text>
                <View style={styles.individualMetaRow}>
                  <Text style={[styles.videoMeta, styles.individualMetaText, { color: textMuted }]} numberOfLines={1}>
                    {video.language}
                  </Text>
                  {!video.isFree && !isCompAccount() ? (
                    <View style={[styles.individualPriceRow, { justifyContent: 'center' }]}>
                      <Text
                        style={[
                          styles.videoMeta,
                          styles.individualMetaText,
                          {
                            color: !shouldShowPremiumBadge(video.title) ? (colorScheme === 'dark' ? '#FFFFFF' : '#800000') : textSecondary,
                            fontSize: !shouldShowPremiumBadge(video.title) ? 10 : 12
                          }
                        ]}
                        numberOfLines={1}>
                        {!shouldShowPremiumBadge(video.title) ? 'UNLOCKED' : normalizeCostLabel(video.individualPriceLabel ?? video.priceLabel)}
                      </Text>
                      {shouldShowPremiumBadge(video.title) && (
                        <View style={styles.inlinePremiumBadgeSmall}>
                          <MaterialIcons name="workspace-premium" size={10} color="#FFE4EC" />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.individualCostCenterPlaceholder} />
                  )}
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      void toggleBookmark(video.title);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={bookmarks.includes(video.title) ? 'Remove bookmark' : 'Add bookmark'}
                    style={styles.individualBookmarkButton}>
                    <MaterialIcons
                      name={bookmarks.includes(video.title) ? 'bookmark' : 'bookmark-border'}
                      size={20}
                      color={bookmarks.includes(video.title) ? accent : textSecondary}
                    />
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>

        {upcomingItems.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Coming Soon</Text>
              <View style={[styles.tagPill, { borderColor: border, backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
                <Text style={[styles.tagText, { color: '#FFB800' }]}>EXCITED</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categorySlideRow}>
              {upcomingItems.map((item) => (
                <View key={item.id} style={[styles.upcomingCard, { backgroundColor: cardBg, borderColor: border }]}>
                  <View style={styles.upcomingThumbWrap}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.upcomingThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.upcomingThumb, { backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons name={item.kind === 'video' ? 'movie' : 'layers'} size={40} color={textMuted} />
                      </View>
                    )}
                    <View style={styles.upcomingOverlay}>
                      <View style={styles.upcomingBadge}>
                        <Text style={styles.upcomingBadgeText}>COMING SOON</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.upcomingTitle, { color: textPrimary }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.upcomingSubtitle, { color: textMuted }]} numberOfLines={1}>{item.subtitle || (item.kind === 'video' ? 'New Video Course' : 'New Content Pack')}</Text>
                  <View style={styles.upcomingFooter}>
                    <View style={styles.releaseTag}>
                      <MaterialIcons name="event" size={12} color={accent} />
                      <Text style={[styles.releaseText, { color: accent }]}>{item.releaseDate || 'TBA'}</Text>
                    </View>
                    <Pressable
                      style={[styles.notifyBtn, { backgroundColor: accent }]}
                      onPress={() => Alert.alert('Coming Soon', 'We will notify you once this is released!')}
                    >
                      <Text style={styles.notifyBtnText}>Notify Me</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Recommended Videos</Text>
          <Text style={[styles.sectionLink, { color: textSecondary }]}>For You</Text>
        </View>
        {upcomingLike.length === 0 ? (
          <View style={[styles.categorySlideCard, { backgroundColor: cardBg, borderColor: border, width: '100%', marginBottom: 12 }]}>
            <Text style={[styles.videoMeta, { color: textMuted }]}>Select videos in dashboard to see them here.</Text>
          </View>
        ) : (
          upcomingLike.map((video) => (
            <VideoRowCard
              key={video.title}
              thumbnail={video.thumbnail}
              title={video.title}
              subtitle={video.subtitle}
              meta={video.meta}
              description={video.description}
              priceLabel={getAccessLabel(video.title, video.priceLabel)}
              rating={video.rating}
              bookmarked={bookmarks.includes(video.title)}
              onBookmarkPress={() => {
                void toggleBookmark(video.title);
              }}
              onPress={() => openVideoDetails(video.title)}
            />
          ))
        )}


        {selectedCategorySections.map((section) => (
          <View key={section.categoryName} style={styles.recommendedCategoryBlock}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>{section.categoryName}</Text>
              <Pressable onPress={() => router.push(`/category/${encodeURIComponent(section.categoryName)}`)}>
                <Text style={[styles.sectionLink, { color: textSecondary }]}>See all</Text>
              </Pressable>
            </View>
            {section.videos.slice(0, 6).map((video) => (
              <VideoRowCard
                key={`${section.categoryName}-${video.title}`}
                thumbnail={video.thumbnail}
                title={video.title}
                subtitle={video.subtitle}
                meta={video.meta}
                description={video.description}
                priceLabel={getAccessLabel(video.title, video.priceLabel)}
                rating={video.rating}
                bookmarked={bookmarks.includes(video.title)}
                onBookmarkPress={() => {
                  void toggleBookmark(video.title);
                }}
                onPress={() => openVideoDetails(video.title)}
              />
            ))}
          </View>
        ))}

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
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuOverlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBackdrop: {
    flex: 1,
  },
  menuSheet: {
    width: '86%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  menuItemPressed: {
    opacity: 0.75,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuItemDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#800000',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  headerIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerLogo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#2A1E3C',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '72%',
    backgroundColor: '#B8C1CC',
  },
  progressHalf: {
    width: '54%',
  },
  progressQuarter: {
    width: '32%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  horizontalRow: {
    gap: 10,
    paddingBottom: 6,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  searchTrigger: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchTriggerText: {
    fontSize: 14,
  },
  carouselWrapper: {
    marginBottom: 14,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  carouselDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  carouselDotActive: {
    width: 18,
    borderRadius: 8,
  },
  carouselCard: {
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#322147',
    backgroundColor: '#1A1027',
    position: 'relative',
  },
  carouselThumb: {
    width: '100%',
    height: '100%',
  },
  carouselWatchIcon: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselWatchIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 1,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A2B52',
    backgroundColor: '#1A1027',
  },
  chipActive: {
    borderColor: '#B8C1CC',
    backgroundColor: '#2A1B3F',
  },
  chipText: {
    color: '#B2A9C5',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#E5EAF1',
  },
  videoCardWide: {
    width: 260,
    backgroundColor: '#1A1027',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#322147',
    padding: 14,
  },
  thumbWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  thumbImage: {
    width: '100%',
    height: 132,
    borderRadius: 10,
    backgroundColor: '#0F0A16',
  },
  playOverlay: {
    position: 'absolute',
    top: '42%',
    left: '44%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 2,
  },
  badgePill: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeUnlocked: {
    backgroundColor: 'rgba(72, 116, 132, 0.28)',
    borderColor: 'rgba(198, 223, 231, 0.6)',
  },
  badgeLocked: {
    backgroundColor: 'rgba(120, 72, 94, 0.32)',
    borderColor: 'rgba(219, 170, 191, 0.62)',
  },
  badgePillText: {
    color: '#F4F7FA',
    fontSize: 12,
    fontWeight: '800',
  },
  badgeCheck: {
    color: '#49D17D',
  },
  accessPill: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  accessFree: {
    backgroundColor: 'rgba(52, 146, 94, 0.2)',
    borderColor: 'rgba(91, 203, 141, 0.55)',
  },
  accessPaid: {
    backgroundColor: 'rgba(95, 88, 146, 0.2)',
    borderColor: 'rgba(158, 147, 230, 0.55)',
  },
  accessText: {
    color: '#DDE3EA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoCard: {
    backgroundColor: '#1A1027',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#322147',
    padding: 14,
    marginBottom: 10,
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  videoContent: {
    flex: 1,
  },
  videoThumbSmWrap: {
    position: 'relative',
  },
  videoThumbSm: {
    width: 72,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0F0A16',
  },
  playOverlaySmall: {
    position: 'absolute',
    top: 18,
    left: 26,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconSmall: {
    color: '#FFFFFF',
    fontSize: 10,
    marginLeft: 1,
  },
  videoBadge: {
    color: '#A59BBB',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  videoTitle: {
    color: '#F0ECF8',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  videoMeta: {
    color: '#AFA5C0',
    fontSize: 12,
    marginBottom: 10,
  },
  categorySlideRow: {
    gap: 10,
    paddingBottom: 6,
    marginBottom: 10,
  },
  categorySlideCard: {
    width: 260,
    backgroundColor: '#1A1027',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#322147',
    padding: 14,
  },
  categoryThumbLarge: {
    width: '100%',
    height: 132,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#0F0A16',
  },
  individualThumbWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  individualPremiumBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(92, 20, 44, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(236, 191, 204, 0.9)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  individualMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  individualMetaText: {
    marginBottom: 0,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  individualPriceRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  individualCostCenter: {
    textAlign: 'center',
  },
  individualCostCenterPlaceholder: {
    flex: 1,
  },
  individualBookmarkButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  categoryMetaText: {
    marginBottom: 0,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBookmarkButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPriceText: {
    fontSize: 13,
    fontWeight: '800',
  },
  inlinePremiumBadgeSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(92, 20, 44, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(236, 191, 204, 0.9)',
  },
  recommendedCategoryBlock: {
    marginTop: 4,
    marginBottom: 8,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  skeletonLogo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
  },
  skeletonSearch: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  skeletonCarousel: {
    height: 190,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  skeletonLineLg: {
    width: 160,
    height: 16,
    borderRadius: 8,
  },
  skeletonLineSm: {
    width: 80,
    height: 14,
    borderRadius: 7,
  },
  skeletonCard: {
    height: 112,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 12,
  },
  upcomingCard: {
    width: 260,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  upcomingThumbWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  upcomingThumb: {
    width: '100%',
    height: 132,
    borderRadius: 12,
  },
  upcomingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  upcomingBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  upcomingSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  upcomingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  releaseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  releaseText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notifyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  notifyBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
