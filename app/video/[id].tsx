import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackNavButton } from '@/components/navigation/back-nav-button';
import { AccordionSection } from '@/components/ui/accordion-section';
import { PricingTierSheet } from '@/components/ui/pricing-tier-sheet';
import { HeroInlinePlayer } from '@/components/video/hero-inline-player';
import { MoreVideosOttRow } from '@/components/video/more-videos-ott-row';
import { allowsIndividualVideoPurchase } from '@/constants/video-purchase-rules';
import { getStreamUrl } from '@/lib/stream-url';
import { isCompAccount } from '@/lib/comp-account';
import { usePractice } from '@/providers/practice-provider';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWatchProgressMap } from '@/hooks/use-watch-progress-map';
import { useCatalog } from '@/providers/catalog-provider';
import { useLibrary } from '@/providers/library-provider';
import { usePurchase } from '@/providers/purchase-provider';

function normalizeRupeeLabel(input: string): string {
  const text = input.trim();
  if (!text) return 'Buy Video';
  if (text.includes('₹')) return text;
  if (/^\d+(?:\.\d+)?$/.test(text)) return `₹${text}`;
  return text;
}

export default function VideoDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const decodedId = decodeURIComponent(params.id ?? '');
  const {
    getVideoDetailsByTitle,
    videoAccessByTitle,
    videosByCategory,
    getCategoryPackTotalPrice,
    getCategoryValidity,
    isInCategoryPack,
    homeConfig,
  } = useCatalog();
  const isReviewMode = homeConfig?.isReviewMode ?? false;
  const buyButtonText = homeConfig?.buyButtonText ?? 'Buy Now';
  const video = getVideoDetailsByTitle(decodedId);
  const accessMeta = videoAccessByTitle[video.title] ?? {
    category: video.category ?? 'General',
    isFree: Boolean(video.isFree),
  };

  const appBg = useThemeColor({}, 'appBg');
  const surface = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const iconActive = useThemeColor({}, 'appTabIconActive');
  const accent = useThemeColor({}, 'appAccent');
  const { purchaseVideo, purchaseCategory, hasCategoryAccess, hasVideoAccess } = usePurchase();
  const { hasPractice } = usePractice();
  const { progressForTitle, refresh: refreshWatchProgress } = useWatchProgressMap();
  const { bookmarks, toggleBookmark } = useLibrary();
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const headerBarPad = insets.top + 44;

  const categoryPurchased = hasCategoryAccess(accessMeta.category);
  const canWatch = hasVideoAccess(video.title, accessMeta);
  const allowIndividual = allowsIndividualVideoPurchase(video.title, isInCategoryPack);
  const showBuyVideo = !accessMeta.isFree && !canWatch && allowIndividual;
  const packTotal = getCategoryPackTotalPrice(accessMeta.category);
  const pricingTiers = video.pricingTiers ?? [];
  const [showTierSheet, setShowTierSheet] = useState(false);
  const onBuyVideoPress = () => {
    if (pricingTiers.length > 0) setShowTierSheet(true);
    else purchaseVideo(video.title);
  };

  const categoryVideoRows = useMemo(() => {
    const packRaw = videosByCategory[accessMeta.category] ?? [];
    const mapped = packRaw.map((v) => ({
      title: v.title,
      subtitle: v.subtitle,
      meta: v.meta,
      priceLabel: v.priceLabel,
      rating: v.rating,
      thumbnail: v.thumbnail,
    }));
    if (mapped.length === 0) {
      return [
        {
          title: video.title,
          subtitle: video.subtitle,
          meta: video.meta,
          priceLabel: video.priceLabel,
          rating: video.rating,
          thumbnail: video.thumbnail,
        },
      ];
    }
    if (mapped.some((r) => r.title === video.title)) {
      return mapped;
    }
    return [
      {
        title: video.title,
        subtitle: video.subtitle,
        meta: video.meta,
        priceLabel: video.priceLabel,
        rating: video.rating,
        thumbnail: video.thumbnail,
      },
      ...mapped,
    ];
  }, [
    accessMeta.category,
    getVideoDetailsByTitle,
    video.title,
    video.subtitle,
    video.meta,
    video.priceLabel,
    video.rating,
    video.thumbnail,
    videosByCategory,
  ]);

  const showPackPurchase =
    !accessMeta.isFree && !canWatch && !allowIndividual && !categoryPurchased && Boolean(packTotal);
  const showMoreVideos = isInCategoryPack(video.title);
  const validityLabel = useMemo(() => {
    if (accessMeta.isFree) return 'Free access';
    if (!allowIndividual) {
      const catDays = getCategoryValidity(accessMeta.category);
      const catLabel = catDays === 0 ? 'Lifetime' : `${catDays} days`;
      return `Access via ${accessMeta.category} pack (${catLabel})`;
    }
    const days = Math.max(0, video.accessValidityDays ?? 0);
    if (days === 0) return 'Validity: Lifetime access';
    return `Validity: ${days} day${days > 1 ? 's' : ''} after purchase`;
  }, [accessMeta.isFree, allowIndividual, video.accessValidityDays, accessMeta.category, getCategoryValidity]);

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  const contentBg = useThemeColor({}, 'appSurface');
  const contentText = useThemeColor({}, 'appTextPrimary');
  const contentMuted = useThemeColor({}, 'appTextMuted');
  const contentBorder = useThemeColor({}, 'appBorder');
  const contentPillBg = useThemeColor({}, 'appSurfaceAlt');

  return (
    <View style={styles.rootShell} collapsable={false}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]} edges={['left', 'right', 'bottom']}>
        <View style={[styles.scrollPad, { paddingTop: headerBarPad }]}>
          <ScrollView
            stickyHeaderIndices={[0]}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 22 }]}
            showsVerticalScrollIndicator={false}>
            <View style={[styles.stickySection, { backgroundColor: appBg }]}>
              <View style={[styles.heroWrap, { borderColor: border, backgroundColor: '#000000' }]}>
                <HeroInlinePlayer
                  key={`${video.title}-${canWatch ? '1' : '0'}`}
                  sourceUri={getStreamUrl(video)}
                  poster={video.thumbnail}
                  disabled={!canWatch}
                  videoTitle={canWatch ? video.title : undefined}
                  onWatchProgressSaved={refreshWatchProgress}
                />
                <Pressable
                  onPress={() => {
                    Animated.sequence([
                      Animated.spring(bookmarkScale, { toValue: 1.16, friction: 6, tension: 220, useNativeDriver: true }),
                      Animated.spring(bookmarkScale, { toValue: 1, friction: 7, tension: 220, useNativeDriver: true }),
                    ]).start();
                    void toggleBookmark(video.title);
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={bookmarks.includes(video.title) ? 'Remove bookmark' : 'Add bookmark'}
                  style={styles.heroBookmarkButton}>
                  <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                    <MaterialIcons
                      name={bookmarks.includes(video.title) ? 'bookmark' : 'bookmark-border'}
                      size={24}
                      color={bookmarks.includes(video.title) ? accent : '#FFFFFF'}
                    />
                  </Animated.View>
                </Pressable>
              </View>

              <View style={[styles.stickyTitleCard, { backgroundColor: contentBg, borderColor: contentBorder }]}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: contentText }]} numberOfLines={2}>
                    {video.title}
                  </Text>
                </View>
                {hasPractice(video.title) ? (
                  <Pressable
                    style={[styles.practiceButton, { backgroundColor: accent }]}
                    onPress={() => router.push(`/quiz/${encodeURIComponent(video.title)}` as any)}>
                    <MaterialIcons name="school" size={18} color="#FFFFFF" />
                    <Text style={styles.practiceButtonText}>Practice This Lesson</Text>
                  </Pressable>
                ) : null}
                {!canWatch && !accessMeta.isFree && !allowIndividual ? (
                  <Text style={[styles.titlePriceHint, { color: contentMuted }]}>
                    {`Category pack (total): ${packTotal ?? '—'}`}
                  </Text>
                ) : null}
                {!canWatch && showBuyVideo && !isReviewMode && Platform.OS !== 'ios' ? (
                  <Pressable
                    style={[styles.titleBuyNowButton, { backgroundColor: accent }]}
                    onPress={onBuyVideoPress}>
                    <MaterialIcons name="shopping-cart" size={20} color="#FFFFFF" />
                    <Text style={styles.titleBuyNowText}>
                      {pricingTiers.length > 0
                        ? `${buyButtonText} · from ${normalizeRupeeLabel(
                            String(Math.min(...pricingTiers.map((t) => Math.round(t.amountCents / 100))))
                          )}`
                        : `${buyButtonText} · ${normalizeRupeeLabel(video.individualPriceLabel ?? video.priceLabel)}`}
                    </Text>
                  </Pressable>
                ) : null}
                {!canWatch && allowIndividual ? (
                  <Text style={[styles.titlePriceHint, { color: contentMuted }]}>{validityLabel}</Text>
                ) : null}
                {showPackPurchase && !isReviewMode && Platform.OS !== 'ios' ? (
                  <Pressable
                    style={[styles.titleBuyNowButton, { backgroundColor: accent }]}
                    onPress={() => purchaseCategory(accessMeta.category)}>
                    <MaterialIcons name="layers" size={20} color="#FFFFFF" />
                    <Text style={styles.titleBuyNowText}>
                      {buyButtonText} {accessMeta.category} pack · {packTotal}
                    </Text>
                  </Pressable>
                ) : null}
                {!canWatch && !accessMeta.isFree && Platform.OS === 'ios' ? (
                  <View style={[styles.iosLockedNote, { borderColor: contentBorder }]}>
                    <MaterialIcons name="lock" size={16} color={contentMuted} />
                    <Text style={[styles.iosLockedText, { color: contentMuted }]}>
                      This course is locked. Sign in with an account that has access to watch.
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {showMoreVideos && categoryVideoRows.length > 0 ? (
              <View style={styles.moreOttSection}>
                <Text style={styles.moreOttHeading}>More videos · {accessMeta.category}</Text>
                {categoryVideoRows.map((item, index) => {
                  const details = getVideoDetailsByTitle(item.title);
                  const isCurrent = item.title === video.title;
                  const metaLine = `Part ${index + 1} · ${details.duration} · ${details.rating.toFixed(1)}★`;
                  return (
                    <MoreVideosOttRow
                      key={item.title}
                      title={item.title}
                      metaLine={metaLine}
                      description={details.description}
                      thumbnail={item.thumbnail}
                      isCurrent={isCurrent}
                      accentColor={accent}
                      thumbProgressPercent={progressForTitle(item.title)}
                      onPress={() => {
                        if (!isCurrent) {
                          router.push(`/video/${encodeURIComponent(item.title)}`);
                        }
                      }}
                    />
                  );
                })}
              </View>
            ) : null}

            <View style={[styles.detailsCard, { backgroundColor: contentBg, borderColor: contentBorder }]}>
              <View style={styles.infoRow}>
                <View style={[styles.infoPill, { borderColor: contentBorder, backgroundColor: contentPillBg }]}>
                  <MaterialIcons name="schedule" size={15} color={iconActive} />
                  <Text style={[styles.infoText, { color: contentText }]}>{video.duration}</Text>
                </View>
                <View style={[styles.infoPill, { borderColor: contentBorder, backgroundColor: contentPillBg }]}>
                  <MaterialIcons name="star" size={15} color={iconActive} />
                  <Text style={[styles.infoText, { color: contentText }]}>{video.rating.toFixed(1)}</Text>
                </View>
              </View>

              <AccordionSection
                title="About this video"
                defaultOpen
                borderColor={contentBorder}
                titleColor={contentText}
                chevronColor={textMuted}>
                <Text style={[styles.description, { color: contentMuted }]}>{video.description}</Text>
              </AccordionSection>

              <AccordionSection
                title="Key Topics"
                borderColor={contentBorder}
                titleColor={contentText}
                chevronColor={textMuted}>
                {video.topics.map((topic) => (
                  <View key={topic} style={[styles.topicRow, { borderColor: contentBorder }]}>
                    <MaterialIcons name="check-circle" size={17} color={iconActive} />
                    <Text style={[styles.topicText, { color: contentText }]}>{topic}</Text>
                  </View>
                ))}
              </AccordionSection>

              <View style={styles.footerMetaRow}>
                <Text style={[styles.footerMeta, { color: contentMuted }]}>Language: {video.language}</Text>
                <Text style={[styles.footerMeta, { color: contentMuted }]}>
                  {canWatch
                    ? 'Accessible'
                    : accessMeta.isFree
                      ? 'FREE'
                      : allowIndividual
                        ? normalizeRupeeLabel(video.individualPriceLabel ?? video.priceLabel)
                        : `Pack ${packTotal ?? '—'}`}
                </Text>
              </View>
            </View>

            <View style={[styles.accessCard, { backgroundColor: surface, borderColor: border }]}>
              <Text style={[styles.accessTitle, { color: textPrimary }]}>Access</Text>
              <Text style={[styles.accessText, { color: textSecondary }]}>
                {isCompAccount()
                  ? 'This video is available to watch.'
                  : accessMeta.isFree
                  ? 'This video is free to watch.'
                  : categoryPurchased
                    ? `Unlocked via "${accessMeta.category}" category purchase.`
                    : canWatch
                      ? isInCategoryPack(video.title)
                        ? categoryPurchased
                          ? `Included in your "${accessMeta.category}" pack.`
                          : 'Unlocked.'
                        : 'Unlocked with individual video purchase.'
                      : allowIndividual
                        ? 'Purchase this video individually to unlock playback.'
                        : packTotal
                          ? `This video is only available with the "${accessMeta.category}" pack (${packTotal}). Individual purchase is not available for pack videos.`
                          : `This video is only available with the "${accessMeta.category}" pack. Individual purchase is not available for pack videos.`}
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      <View
        style={[
          styles.headerOverlay,
          {
            paddingTop: insets.top,
            backgroundColor: appBg,
            borderBottomColor: border,
          },
        ]}>
        <BackNavButton onPress={onBack} />
        <View style={styles.headerSpacer} />
      </View>

      <PricingTierSheet
        visible={showTierSheet}
        tiers={pricingTiers}
        accent={accent}
        onClose={() => setShowTierSheet(false)}
        onSelect={(i) => {
          setShowTierSheet(false);
          purchaseVideo(video.title, i);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootShell: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    position: 'relative',
  },
  scrollPad: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40000,
    elevation: 40000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  content: {
    gap: 10,
    paddingTop: 2,
  },
  stickySection: {
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  stickyTitleCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    height: 190,
    marginBottom: 12,
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    marginTop: 10,
  },
  iosLockedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  iosLockedText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  practiceButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  heroBookmarkButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 20,
  },
  detailsCard: {
    marginHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
  },
  titleBuyNowButton: {
    marginTop: 12,
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  titleBuyNowText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  titlePriceHint: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  moreOttSection: {
    backgroundColor: '#000000',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 6,
    marginBottom: 10,
  },
  moreOttHeading: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 10,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 6,
  },
  topicText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  footerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 6,
    marginTop: 12,
  },
  footerMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  accessCard: {
    marginHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  accessTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  accessText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
});
