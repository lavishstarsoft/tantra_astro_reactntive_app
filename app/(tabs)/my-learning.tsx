import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackNavButton } from '@/components/navigation/back-nav-button';

import { VideoRowCard } from '@/components/video/video-row-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWatchProgressMap } from '@/hooks/use-watch-progress-map';
import { useCatalog } from '@/providers/catalog-provider';
import { useLibrary } from '@/providers/library-provider';
import { usePurchase } from '@/providers/purchase-provider';
import { usePractice } from '@/providers/practice-provider';

const formatDate = (isoString: string | null | undefined) => {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return null;
  }
};

export default function MyLearningScreen() {
  const { allVideos, videoAccessByTitle } = useCatalog();
  const { hasVideoAccess, purchasedVideos, purchasedCategories, getExpirationDate } = usePurchase();
  const { isAvailable: practiceAvailable, mastery, roadmap } = usePractice();
  const { progressMap, bookmarks, toggleBookmark } = useLibrary();
  const { progressForTitle } = useWatchProgressMap();
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');
  const accentSoft = useThemeColor({}, 'appAccentSoft');

  const purchasedVideoTitles = Object.keys(purchasedVideos || {});
  const purchasedCategoryNames = Object.keys(purchasedCategories || {});

  const watchedRows = allVideos
    .map((video) => {
      const entry = progressMap[video.title];
      const updatedAt = entry?.updatedAt ?? 0;
      const percent = progressForTitle(video.title) ?? 0;
      return { video, updatedAt, percent };
    })
    .filter((row) => row.updatedAt > 0 && row.percent > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const allWatchHistory = watchedRows;

  const purchasedHistory = watchedRows.filter((row) => {
    const meta = videoAccessByTitle[row.video.title];
    if (meta?.isFree || row.video.isFree) {
      return false;
    }
    return hasVideoAccess(row.video.title, meta);
  });

  const purchasedByCategory = purchasedHistory.reduce<Record<string, typeof purchasedHistory>>((acc, row) => {
    const meta = videoAccessByTitle[row.video.title];
    const key = meta?.category ?? row.video.category ?? 'General';
    acc[key] ??= [];
    acc[key].push(row);
    return acc;
  }, {});
  const purchasedCategoryEntries = Object.entries(purchasedByCategory).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackNavButton onPress={() => router.back()} />
        </View>
        <View style={styles.hero}>
          <View style={[styles.heroIconRing, { borderColor: textSecondary, backgroundColor: cardBg }]}>
            <MaterialIcons name="school" size={30} color={accent} />
          </View>
          <Text style={[styles.title, { color: textPrimary }]}>My Learning</Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>Your watch history — free and purchased.</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.summaryLeft}>
            <View style={[styles.summaryIconWrap, { backgroundColor: accentSoft }]}>
              <MaterialIcons name="history" size={20} color={accent} />
            </View>
            <View>
              <Text style={[styles.summaryHeading, { color: textPrimary }]}>{watchedRows.length} videos in watch history</Text>
              <Text style={[styles.summaryText, { color: textMuted }]}>All: {allWatchHistory.length} · UNLOCKED: {purchasedHistory.length}</Text>
            </View>
          </View>
        </View>

        {practiceAvailable && (mastery.length > 0 || roadmap.length > 0) ? (
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Practice &amp; Master</Text>
                <Text style={[styles.sectionMeta, { color: textMuted }]}>Your topic mastery</Text>
              </View>
              <MaterialIcons name="workspace-premium" size={22} color={accent} />
            </View>
            {mastery.map((m) => (
              <View key={m.topic} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: textPrimary, fontWeight: '600', fontSize: 13 }}>{m.topic}</Text>
                  <Text style={{ color: textMuted, fontSize: 13 }}>{m.percent}%</Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: accentSoft, overflow: 'hidden' }}>
                  <View style={{ width: `${m.percent}%`, height: '100%', backgroundColor: accent }} />
                </View>
              </View>
            ))}
            {roadmap.length > 0 ? (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: 14 }]}>Recommended next</Text>
                {roadmap.map((r) => (
                  <Pressable
                    key={r.title}
                    onPress={() => router.push(`/video/${encodeURIComponent(r.title)}` as any)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                    <MaterialIcons name="play-lesson" size={18} color={accent} />
                    <Text style={{ color: textPrimary, flex: 1, fontSize: 13 }} numberOfLines={1}>{r.title}</Text>
                    <MaterialIcons name="chevron-right" size={18} color={textMuted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {purchasedVideoTitles.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>UNLOCKED individual courses</Text>
                <Text style={[styles.sectionMeta, { color: textMuted }]}>{purchasedVideoTitles.length} videos</Text>
              </View>
              <View style={[styles.tagPill, { borderColor: border, backgroundColor: accentSoft }]}>
                <Text style={[styles.tagText, { color: accent }]}>Individual</Text>
              </View>
            </View>
            <View style={styles.chipsWrap}>
              {purchasedVideoTitles.map((title) => {
                const expiry = formatDate(getExpirationDate('video', title));
                return (
                  <Pressable key={`purchased-video-${title}`} style={[styles.chip, { borderColor: border, backgroundColor: cardBg }]} onPress={() => router.push(`/video/${encodeURIComponent(title)}`)}>
                    <View style={styles.chipInner}>
                      <Text style={[styles.chipText, { color: textPrimary }]} numberOfLines={1}>{title}</Text>
                      {expiry && (
                        <View style={styles.expiryBadge}>
                          <Text style={[styles.expiryText, { color: textMuted }]}>Expires: {expiry}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {purchasedCategoryNames.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>UNLOCKED categories</Text>
                <Text style={[styles.sectionMeta, { color: textMuted }]}>{purchasedCategoryNames.length} categories</Text>
              </View>
              <View style={[styles.tagPill, { borderColor: border, backgroundColor: accentSoft }]}>
                <Text style={[styles.tagText, { color: accent }]}>Category Pack</Text>
              </View>
            </View>
            <View style={styles.chipsWrap}>
              {purchasedCategoryNames.map((name) => {
                const expiry = formatDate(getExpirationDate('category', name));
                return (
                  <Pressable key={`purchased-category-${name}`} style={[styles.chip, { borderColor: border, backgroundColor: cardBg }]} onPress={() => router.push(`/category/${encodeURIComponent(name)}`)}>
                    <View style={styles.chipInner}>
                      <Text style={[styles.chipText, { color: textPrimary }]} numberOfLines={1}>{name}</Text>
                      {expiry && (
                        <View style={styles.expiryBadge}>
                          <Text style={[styles.expiryText, { color: textMuted }]}>Expires: {expiry}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {watchedRows.length === 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>No watch history yet</Text>
            <Text style={[styles.sectionMeta, { color: textMuted }]}>
              Start watching any free or UNLOCKED video — it will appear here automatically.
            </Text>
          </View>
        ) : null}

        {allWatchHistory.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Watch history</Text>
                <Text style={[styles.sectionMeta, { color: textMuted }]}>{allWatchHistory.length} videos</Text>
              </View>
            </View>
            {allWatchHistory.slice(0, 5).map(({ video }) => (
              <VideoRowCard
                key={`free-${video.title}`}
                thumbnail={video.thumbnail}
                title={video.title}
                subtitle={video.subtitle}
                meta={video.meta}
                priceLabel="Resume"
                rating={video.rating}
                progressPercent={progressForTitle(video.title) || undefined}
                bookmarked={bookmarks.includes(video.title)}
                onBookmarkPress={() => {
                  void toggleBookmark(video.title);
                }}
                onPress={() => router.push(`/video/${encodeURIComponent(video.title)}`)}
              />
            ))}

            {allWatchHistory.length > 5 && (
              <Pressable 
                onPress={() => router.push('/continue-watching' as any)}
                style={[styles.loadMoreButton, { borderColor: border }]}
              >
                <Text style={[styles.loadMoreText, { color: accent }]}>Load More</Text>
                <MaterialIcons name="arrow-forward" size={16} color={accent} />
              </Pressable>
            )}
          </View>
        ) : null}


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
    paddingBottom: 14,
  },
  header: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  summaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryHeading: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  summaryText: {
    marginTop: 2,
    fontSize: 12,
    flexShrink: 1,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionMeta: {
    marginTop: 2,
    fontSize: 12,
  },
  tagPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryGroup: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  categoryGroupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  chipInner: {
    gap: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
