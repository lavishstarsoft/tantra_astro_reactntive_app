import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Video, { type OnProgressData } from 'react-native-video';

import { type ShortLesson } from '@/constants/shorts';
import { useShorts } from '@/hooks/use-shorts';
import { useShortsEngagement } from '@/hooks/use-shorts-engagement';

const ACCENT = '#8F3D66'; // app maroon accent
const DOUBLE_TAP_MS = 280;
const WEB_BASE = (process.env.EXPO_PUBLIC_CMS_BASE_URL || 'https://www.thantraastro.in').replace(/\/$/, '');

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const shareUrlFor = (id: string) => `${WEB_BASE}/shorts?id=${encodeURIComponent(id)}`;

function RailButton({ icon, label, color, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.railButton} accessibilityRole="button" accessibilityLabel={label}>
      <MaterialIcons name={icon} size={28} color={color} />
      <Text style={[styles.railLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

type ItemProps = {
  item: ShortLesson;
  isActive: boolean;
  muted: boolean;
  width: number;
  height: number;
  bottomInset: number;
  topInset: number;
  focused: boolean;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onFullLesson?: () => void;
};

function ShortItem({ item, isActive, muted, width, height, bottomInset, topInset, focused, liked, saved, onLike, onSave, onShare, onFullLesson }: ItemProps) {
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heart = useRef(new Animated.Value(0)).current;
  const videoHeight = Math.round(width * (16 / 9));

  useEffect(() => {
    setPaused(false);
    if (!isActive) setProgress(0);
  }, [isActive]);

  const burstHeart = () => {
    heart.setValue(0);
    Animated.sequence([
      Animated.spring(heart, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(heart, { toValue: 0, duration: 220, delay: 260, useNativeDriver: true }),
    ]).start();
  };

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = null;
      if (!liked) onLike();
      burstHeart();
    } else {
      tapTimer.current = setTimeout(() => setPaused((p) => !p), DOUBLE_TAP_MS);
    }
    lastTap.current = now;
  };

  return (
    <View style={{ width, height, backgroundColor: '#000000' }}>
      <Video
        source={{ uri: item.videoUrl }}
        style={{ position: 'absolute', top: topInset, left: 0, right: 0, height: videoHeight, backgroundColor: '#000000' }}
        resizeMode="contain"
        repeat
        paused={paused || !isActive || !focused}
        muted={muted}
        ignoreSilentSwitch="ignore"
        playInBackground={false}
        onProgress={(d: OnProgressData) => {
          if (isActive && d.seekableDuration > 0) setProgress(d.currentTime / d.seekableDuration);
        }}
      />

      <Pressable style={StyleSheet.absoluteFill} onPress={onTap} accessibilityLabel="Toggle playback" />

      {paused && isActive ? (
        <View pointerEvents="none" style={styles.center}>
          <MaterialIcons name="play-arrow" size={76} color="rgba(255,255,255,0.9)" />
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[styles.center, { opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] }) }] }]}>
        <MaterialIcons name="favorite" size={112} color={ACCENT} />
      </Animated.View>

      {item.caption ? (
        <View style={styles.caption} pointerEvents="none">
          <Text style={styles.captionText}>{item.caption}</Text>
        </View>
      ) : null}

      <BlurView intensity={28} tint="dark" style={[styles.rail, { bottom: bottomInset + 128 }]}>
        <RailButton icon={liked ? 'favorite' : 'favorite-border'} label={liked ? 'Liked' : 'Like'} color={liked ? ACCENT : '#FFFFFF'} onPress={onLike} />
        <RailButton icon={saved ? 'bookmark' : 'bookmark-border'} label={saved ? 'Saved' : 'Save'} color={saved ? ACCENT : '#FFFFFF'} onPress={onSave} />
        <RailButton icon="share" label="Share" color="#FFFFFF" onPress={onShare} />
        {onFullLesson ? <RailButton icon="menu-book" label="Full lesson" color="#FFFFFF" onPress={onFullLesson} /> : null}
      </BlurView>

      <View style={[styles.bottom, { paddingBottom: bottomInset + 18 }]} pointerEvents="none">
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {item.teacher ? <Text style={styles.meta}>{item.teacher}</Text> : null}
      </View>
      <View style={[styles.progressTrack, { bottom: bottomInset }]} pointerEvents="none">
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

export default function ShortsScreen() {
  const params = useLocalSearchParams<{ start?: string; topic?: string; id?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { isLiked, isSaved, toggleLike, toggleSave } = useShortsEngagement();
  const { shorts: all, topics, loading } = useShorts();

  // When opened via a deep link (?id=), show all clips so the target is present.
  const deepLinkId = typeof params.id === 'string' ? params.id : undefined;
  const [topic, setTopic] = useState(!deepLinkId && params.topic && topics.includes(params.topic) ? params.topic : 'All');

  const items = useMemo(() => (topic === 'All' ? all : all.filter((s) => s.topic === topic)), [topic, all]);

  const startIndex = useMemo(() => {
    if (deepLinkId) {
      const i = items.findIndex((s) => s.id === deepLinkId);
      if (i >= 0) return i;
    }
    const s = Number(params.start ?? 0) || 0;
    return Math.min(Math.max(s, 0), Math.max(items.length - 1, 0));
  }, [deepLinkId, items, params.start]);

  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(false);
  const listRef = useRef<FlatList<ShortLesson>>(null);
  const didInit = useRef(false);

  // Jump to the deep-linked clip once data is loaded.
  useEffect(() => {
    if (loading || didInit.current || items.length === 0) return;
    didInit.current = true;
    setActive(startIndex);
    if (startIndex > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: startIndex * height, animated: false }));
    }
  }, [loading, items.length, startIndex, height]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first && typeof first.index === 'number') setActive(first.index);
  }).current;

  const onShare = (item: ShortLesson) => {
    const url = shareUrlFor(item.id);
    void Share.share({
      message: `${item.title} — a quick Vedic astrology lesson from Thantra Astro\n${url}`,
      url,
      title: item.title,
    }).catch(() => {});
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={ACCENT} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="movie" size={44} color="rgba(255,255,255,0.5)" />
          <Text style={styles.emptyText}>No quick lessons yet.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item, index }) => (
            <ShortItem
              item={item}
              isActive={index === active}
              muted={muted}
              width={width}
              height={height}
              bottomInset={insets.bottom}
              topInset={insets.top}
              focused={focused}
              liked={isLiked(item.id)}
              saved={isSaved(item.id)}
              onLike={() => toggleLike(item.id)}
              onSave={() => toggleSave(item.id)}
              onShare={() => onShare(item)}
              onFullLesson={item.linkedVideoTitle ? () => router.push(`/video/${encodeURIComponent(item.linkedVideoTitle!)}` as any) : undefined}
            />
          )}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          windowSize={3}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
        />
      )}

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable onPress={goBack} hitSlop={10} style={styles.ctrlBtn} accessibilityRole="button" accessibilityLabel="Back">
            <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => setMuted((m) => !m)} hitSlop={10} style={styles.ctrlBtn} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
            <MaterialIcons name={muted ? 'volume-off' : 'volume-up'} size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.7)', marginTop: 10, fontSize: 14 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctrlBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  chips: { gap: 8, paddingVertical: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  chipActive: { backgroundColor: ACCENT },
  chipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#1A1200' },
  caption: { position: 'absolute', top: '52%', left: 14, right: 78, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  captionText: { color: '#FFFFFF', fontSize: 13, lineHeight: 19 },
  rail: { position: 'absolute', right: 10, alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', backgroundColor: 'rgba(20,10,16,0.28)' },
  railButton: { alignItems: 'center', minWidth: 52, paddingVertical: 4 },
  railLabel: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 14, paddingRight: 78, backgroundColor: 'rgba(0,0,0,0.55)' },
  topicChip: { alignSelf: 'flex-start', backgroundColor: ACCENT, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  topicChipText: { color: '#1A1200', fontSize: 11, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', lineHeight: 21, marginTop: 8 },
  meta: { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 4 },
  progressTrack: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.30)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: ACCENT },
});
