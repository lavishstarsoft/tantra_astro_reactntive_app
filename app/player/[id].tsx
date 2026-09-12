import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, UIManager, View, Dimensions, ScrollView } from 'react-native';
import VideoView, { OnLoadData, OnProgressData, SelectedVideoTrackType, VideoRef } from 'react-native-video';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog } from '@/providers/catalog-provider';
import { useLibrary } from '@/providers/library-provider';
import { getStreamUrl } from '@/lib/stream-url';

type QualityOption = { key: string; label: string; height?: number; };
const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

const BUFFER_CONFIG = {
  minBufferMs: 50000,
  maxBufferMs: 120000,
  bufferForPlaybackMs: 5000, // Increased to 5s for smoother start
  bufferForPlaybackAfterRebufferMs: 8000, // Increased to 8s to prevent frequent pauses
  backBufferDurationMs: 60000,
  cacheSizeMB: 256,
  initialBitrate: 250000, // Lower initial bitrate for faster first frame
};

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function VideoPlayerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; url?: string; t?: string }>();
  const decodedTitle = decodeURIComponent(params.id ?? '');
  const { getVideoDetailsByTitle } = useCatalog();
  const { progressMap, upsertProgress } = useLibrary();
  const catalogVideo = getVideoDetailsByTitle(decodedTitle);
  const title = catalogVideo.title || decodedTitle || 'Video';

  const baseStreamUrl = useMemo(() => {
    if (typeof params.url === 'string' && params.url.length > 0) return decodeURIComponent(params.url);
    return getStreamUrl(catalogVideo);
  }, [params.url, catalogVideo.dashUrl, catalogVideo.hlsUrl]);

  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([{ key: 'auto', label: 'Auto' }]);
  const [selectedQualityKey, setSelectedQualityKey] = useState('auto');
  const [selectedVideoTrack, setSelectedVideoTrack] = useState<{ type: SelectedVideoTrackType; value?: number }>({ type: SelectedVideoTrackType.AUTO });
  
  const [isBuffering, setIsBuffering] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);

  // Advanced Controls State
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playableDuration, setPlayableDuration] = useState(0);
  
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLocked, setIsLocked] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'quality' | 'speed'>('main');

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const controlsHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Double Tap Feedback Animations
  const forwardAnim = useRef(new Animated.Value(0)).current;
  const backwardAnim = useRef(new Animated.Value(0)).current;

  const selectedQualityOption = useMemo(() => qualityOptions.find((q) => q.key === selectedQualityKey) ?? qualityOptions[0], [qualityOptions, selectedQualityKey]);
  
  const playerRef = useRef<VideoRef>(null);
  const durationRef = useRef(0);
  const currentTimeRef = useRef(0);
  const lastSaveMsRef = useRef(0);
  const resumeAppliedRef = useRef(false);

  const resetControlsTimeout = useCallback(() => {
    if (controlsHideTimeout.current) clearTimeout(controlsHideTimeout.current);
    if (isLocked) return; // Don't show full controls if locked
    setShowControls(true);
    Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    
    if (!paused && !showSettingsMenu) {
      controlsHideTimeout.current = setTimeout(() => {
        Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setShowControls(false);
        });
      }, 3500);
    }
  }, [paused, controlsOpacity, showSettingsMenu, isLocked]);

  useEffect(() => {
    if (isLocked) {
      if (controlsHideTimeout.current) clearTimeout(controlsHideTimeout.current);
      setShowControls(false);
      controlsOpacity.setValue(0);
      return;
    }
    
    if (paused || showSettingsMenu) {
      if (controlsHideTimeout.current) clearTimeout(controlsHideTimeout.current);
      setShowControls(true);
      Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      resetControlsTimeout();
    }
  }, [paused, resetControlsTimeout, showSettingsMenu, isLocked]);

  const showDoubleTapFeedback = (anim: Animated.Value) => {
    anim.setValue(1);
    Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }).start();
  };

  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const handleVideoTap = (e: any) => {
    if (isLocked) {
      setShowControls((prev) => !prev);
      if (!showControls) {
        Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        setTimeout(() => {
          Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setShowControls(false));
        }, 3000);
      }
      return;
    }

    const now = Date.now();
    const x = e.nativeEvent.pageX;
    const { width } = Dimensions.get('window');
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
      const isLeft = x < width / 2;
      if (isLeft) {
        seekBackward10s();
        showDoubleTapFeedback(backwardAnim);
      } else {
        seekForward10s();
        showDoubleTapFeedback(forwardAnim);
      }
      lastTapRef.current.time = 0; 
    } else {
      if (showControls) {
        if (controlsHideTimeout.current) clearTimeout(controlsHideTimeout.current);
        Animated.timing(controlsOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowControls(false));
      } else {
        resetControlsTimeout();
      }
      lastTapRef.current = { time: now, x };
    }
  };

  const seekForward10s = () => {
    const target = Math.min(currentTimeRef.current + 10, durationRef.current);
    seekTo(target);
    resetControlsTimeout();
  };

  const seekBackward10s = () => {
    const target = Math.max(currentTimeRef.current - 10, 0);
    seekTo(target);
    resetControlsTimeout();
  };

  const seekTo = (target: number) => {
    setIsBuffering(true);
    playerRef.current?.seek(target);
    currentTimeRef.current = target;
    setCurrentTime(target);
  };

  const togglePlayPause = () => {
    setPaused(!paused);
  };

  const openSettings = () => {
    setSettingsView('main');
    setShowSettingsMenu(true);
  };

  useEffect(() => {
    setSelectedQualityKey('auto');
    setSelectedVideoTrack({ type: SelectedVideoTrackType.AUTO });
    setQualityOptions([{ key: 'auto', label: 'Auto' }]);
    durationRef.current = 0;
    currentTimeRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setPlayableDuration(0);
    resumeAppliedRef.current = false;
    setIsInitialLoad(true);
    setPaused(false);
    setIsLocked(false);
  }, [baseStreamUrl]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE); } catch {}
      if (Platform.OS === 'android') {
        try { await NavigationBar.setVisibilityAsync('hidden'); } catch {}
      }
    })();
    return () => {
      if (!mounted) return;
      mounted = false;
      if (Platform.OS === 'android') void NavigationBar.setVisibilityAsync('visible').catch(() => {});
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const onLoad = useCallback((data: OnLoadData) => {
    durationRef.current = Number(data.duration ?? 0);
    setDuration(durationRef.current);
    setIsBuffering(false);
    setIsInitialLoad(false);

    const tracks = [...(data.videoTracks ?? [])]
      .filter((t) => t && (Number(t.height) > 0))
      .sort((a, b) => Number(a.height ?? 0) - Number(b.height ?? 0));

    const mapped: QualityOption[] = [{ key: 'auto', label: 'Auto' }];
    const seenHeights = new Set<number>();

    for (const track of tracks) {
      const h = Number(track.height);
      if (!h || seenHeights.has(h)) continue;
      seenHeights.add(h);
      const bitrate = track.bitrate ? ` (${Math.round(track.bitrate / 1000)} kbps)` : '';
      mapped.push({ key: String(h), label: `${h}p${bitrate}`, height: h });
    }
    
    setQualityOptions(mapped);

    if (!resumeAppliedRef.current) {
      const routeTime = typeof params.t === 'string' ? Number(decodeURIComponent(params.t)) : NaN;
      const resumeFromProgress = progressMap[title]?.currentTime ?? 0;
      const resumeTarget = Number.isFinite(routeTime) && routeTime > 0 ? routeTime : resumeFromProgress;
      if (Number.isFinite(resumeTarget) && resumeTarget > 1) {
        currentTimeRef.current = resumeTarget;
        setCurrentTime(resumeTarget);
        playerRef.current?.seek(resumeTarget);
      }
      resumeAppliedRef.current = true;
    }
  }, [params.t, progressMap, title]);

  const onVideoTracks = useCallback((data: any) => {
    if (!data.videoTracks || data.videoTracks.length === 0) return;
    
    const tracks = [...data.videoTracks]
      .filter((t) => t && (Number(t.height) > 0))
      .sort((a, b) => Number(a.height ?? 0) - Number(b.height ?? 0));

    const mapped: QualityOption[] = [{ key: 'auto', label: 'Auto' }];
    const seenHeights = new Set<number>();

    for (const track of tracks) {
      const h = Number(track.height);
      if (!h || seenHeights.has(h)) continue;
      seenHeights.add(h);
      const bitrate = track.bitrate ? ` (${Math.round(track.bitrate / 1000)} kbps)` : '';
      mapped.push({ key: String(h), label: `${h}p${bitrate}`, height: h });
    }
    setQualityOptions(mapped);
  }, []);

  const onProgress = (data: OnProgressData) => {
    currentTimeRef.current = Number(data.currentTime ?? 0);
    setCurrentTime(currentTimeRef.current);
    if (Number.isFinite(data.seekableDuration) && Number(data.seekableDuration) > 0) {
      durationRef.current = Number(data.seekableDuration);
      setDuration(durationRef.current);
    }
    if (Number.isFinite(data.playableDuration)) {
      setPlayableDuration(Number(data.playableDuration));
    }
    const now = Date.now();
    if (now - lastSaveMsRef.current < 6000) return;
    lastSaveMsRef.current = now;
    if (title && durationRef.current > 0) {
      void upsertProgress(title, currentTimeRef.current, durationRef.current).catch(() => {});
    }
  };

  const onBack = () => {
    if (title && durationRef.current > 0) void upsertProgress(title, currentTimeRef.current, durationRef.current).catch(() => {});
    if (router.canGoBack()) { router.back(); return; }
    router.replace('/(tabs)');
  };

  const applyQualitySelection = (key: string) => {
    if (key === 'auto') setSelectedVideoTrack({ type: SelectedVideoTrackType.AUTO });
    else {
      const selected = qualityOptions.find((item) => item.key === key);
      if (selected?.height) setSelectedVideoTrack({ type: SelectedVideoTrackType.RESOLUTION, value: selected.height });
    }
    setSelectedQualityKey(key);
    setShowSettingsMenu(false);
    setIsBuffering(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" hidden />

      {/* ── Video Player ── */}
      <VideoView
        ref={playerRef}
        source={{ uri: baseStreamUrl }}
        style={styles.video}
        controls={false}
        resizeMode="contain"
        paused={paused}
        rate={playbackRate}
        progressUpdateInterval={1000}
        selectedVideoTrack={selectedVideoTrack}
        bufferConfig={BUFFER_CONFIG}
        onLoad={onLoad}
        onProgress={(data) => {
          onProgress(data);
          // Fallback: If progress is moving, video is not loading/buffering
          if (isInitialLoad || isBuffering) {
            setIsInitialLoad(false);
            setIsBuffering(false);
          }
        }}
        onVideoTracks={onVideoTracks}
        onReadyForDisplay={() => {
          setIsInitialLoad(false);
          setIsBuffering(false);
        }}
        onPlaybackStateChanged={({ isPlaying }) => {
          if (isPlaying) {
            setIsInitialLoad(false);
            setIsBuffering(false);
          }
        }}
        onBuffer={({ isBuffering: buffering }) => setIsBuffering(Boolean(buffering))}
        onEnd={() => { 
          setPaused(true); 
          if (title && durationRef.current > 0) void upsertProgress(title, durationRef.current, durationRef.current).catch(() => {}); 
        }}
        onError={(e) => { 
          console.error('Video Error:', e);
          setIsBuffering(false); 
          setIsInitialLoad(false); 
        }}
      />

      {/* ── Tap & Double Tap Overlay ── */}
      <Pressable style={styles.tapOverlay} onPress={handleVideoTap} />

      {/* ── Double Tap Visual Feedback ── */}
      <Animated.View style={[styles.feedbackContainer, styles.feedbackLeft, { opacity: backwardAnim }]} pointerEvents="none">
        <View style={styles.feedbackRipple}>
          <MaterialIcons name="fast-rewind" size={32} color="#FFFFFF" />
          <Text style={styles.feedbackText}>10s</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.feedbackContainer, styles.feedbackRight, { opacity: forwardAnim }]} pointerEvents="none">
        <View style={styles.feedbackRipple}>
          <MaterialIcons name="fast-forward" size={32} color="#FFFFFF" />
          <Text style={styles.feedbackText}>10s</Text>
        </View>
      </Animated.View>

      {/* ── Loading Overlay ── */}
      {(isBuffering || isInitialLoad || isSeeking) && (
        <View style={styles.bufferOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={{ color: '#9BA3AF', marginTop: 12, fontSize: 13 }}>
            {isInitialLoad ? 'Loading Video...' : 'Buffering... slow connection detected'}
          </Text>
        </View>
      )}

      {/* ── Custom Animated Controls Overlay ── */}
      {showControls && (
        <Animated.View style={[styles.controlsContainer, { opacity: controlsOpacity }]} pointerEvents="box-none">
          
          {isLocked ? (
            /* ── Locked State: Only show Unlock Button ── */
            <View style={styles.lockedStateContainer} pointerEvents="box-none">
              <Pressable onPress={() => setIsLocked(false)} style={styles.unlockBtn}>
                <MaterialIcons name="lock-open" size={28} color="#FFFFFF" />
                <Text style={styles.unlockText}>Unlock</Text>
              </Pressable>
            </View>
          ) : (
            /* ── Unlocked State: Full Controls ── */
            <>
              {/* Top Bar */}
              <View style={[styles.topBar, { top: Math.max(insets.top, 10), paddingHorizontal: Math.max(insets.left, 20) }]}>
                <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconBtn}>
                  <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
                </Pressable>
                
                <View style={styles.flex1} />
                
                <Pressable onPress={() => setIsLocked(true)} style={[styles.iconBtn, { marginRight: 16 }]}>
                  <MaterialIcons name="lock" size={26} color="#FFFFFF" />
                </Pressable>

                {Platform.OS !== 'ios' && (
                  <Pressable accessibilityRole="button" onPress={openSettings} style={styles.iconBtn}>
                    <MaterialIcons name="settings" size={26} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>

              {/* Center Play/Pause/Skip Controls */}
              {!isInitialLoad && !isBuffering && (
                <View style={styles.centerControls} pointerEvents="box-none">
                  <Pressable onPress={seekBackward10s} style={styles.centerIconBtn}>
                    <MaterialIcons name="replay-10" size={42} color="#FFFFFF" />
                  </Pressable>
                  
                  <Pressable onPress={togglePlayPause} style={styles.playPauseBtn}>
                    <MaterialIcons name={paused ? "play-arrow" : "pause"} size={54} color="#FFFFFF" />
                  </Pressable>
                  
                  <Pressable onPress={seekForward10s} style={styles.centerIconBtn}>
                    <MaterialIcons name="forward-10" size={42} color="#FFFFFF" />
                  </Pressable>
                </View>
              )}

              {/* Bottom Control Bar */}
              <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom, 20), paddingHorizontal: Math.max(insets.left, 20) }]}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderTrackBg} />
                  <View style={[styles.sliderBufferedTrack, { width: `${duration > 0 ? Math.min((playableDuration / duration) * 100, 100) : 0}%` }]} />
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration || 1}
                    value={currentTime}
                    minimumTrackTintColor="#8F3D66"
                    maximumTrackTintColor="transparent"
                    thumbTintColor="#8F3D66"
                    onSlidingStart={() => { setIsSeeking(true); if (controlsHideTimeout.current) clearTimeout(controlsHideTimeout.current); }}
                    onSlidingComplete={(val) => { setIsSeeking(false); seekTo(val); resetControlsTimeout(); }}
                  />
                </View>
                
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </>
          )}
        </Animated.View>
      )}

      {/* ── Unified Settings bottom sheet ── */}
      {showSettingsMenu && (
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowSettingsMenu(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            
            {settingsView === 'main' && (
              <>
                <Text style={styles.sheetTitle}>Video Settings</Text>
                
                <Pressable style={styles.sheetOption} onPress={() => setSettingsView('quality')}>
                  <View style={styles.sheetOptionLeft}>
                    <MaterialIcons name="high-quality" size={24} color="#A0AEC0" />
                    <Text style={styles.sheetOptionText}>Quality</Text>
                  </View>
                  <View style={styles.sheetOptionRight}>
                    <Text style={styles.sheetOptionSub}>{selectedQualityOption?.label ?? 'Auto'}</Text>
                    <MaterialIcons name="chevron-right" size={24} color="#A0AEC0" />
                  </View>
                </Pressable>

                <Pressable style={styles.sheetOption} onPress={() => setSettingsView('speed')}>
                  <View style={styles.sheetOptionLeft}>
                    <MaterialIcons name="speed" size={24} color="#A0AEC0" />
                    <Text style={styles.sheetOptionText}>Playback Speed</Text>
                  </View>
                  <View style={styles.sheetOptionRight}>
                    <Text style={styles.sheetOptionSub}>{playbackRate === 1 ? 'Normal' : `${playbackRate}x`}</Text>
                    <MaterialIcons name="chevron-right" size={24} color="#A0AEC0" />
                  </View>
                </Pressable>
              </>
            )}

            {settingsView === 'quality' && (
              <>
                <View style={styles.sheetHeader}>
                  <Pressable onPress={() => setSettingsView('main')} style={styles.sheetBackBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
                  </Pressable>
                  <Text style={styles.sheetTitle}>Quality</Text>
                </View>
                <ScrollView style={{ maxHeight: 300 }}>
                  {qualityOptions.map((option) => (
                    <Pressable key={option.key} onPress={() => applyQualitySelection(option.key)} style={styles.sheetCheckOption}>
                      <Text style={[styles.sheetCheckText, option.key === selectedQualityKey && styles.sheetCheckTextActive]}>
                        {option.label}
                      </Text>
                      {option.key === selectedQualityKey && <MaterialIcons name="check-circle" size={20} color="#8F3D66" />}
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {settingsView === 'speed' && (
              <>
                <View style={styles.sheetHeader}>
                  <Pressable onPress={() => setSettingsView('main')} style={styles.sheetBackBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
                  </Pressable>
                  <Text style={styles.sheetTitle}>Playback Speed</Text>
                </View>
                <ScrollView style={{ maxHeight: 300 }}>
                  {SPEED_OPTIONS.map((speed) => (
                    <Pressable 
                      key={speed} 
                      onPress={() => { setPlaybackRate(speed); setShowSettingsMenu(false); }} 
                      style={styles.sheetCheckOption}
                    >
                      <Text style={[styles.sheetCheckText, speed === playbackRate && styles.sheetCheckTextActive]}>
                        {speed === 1 ? 'Normal' : `${speed}x`}
                      </Text>
                      {speed === playbackRate && <MaterialIcons name="check-circle" size={20} color="#8F3D66" />}
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  video: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  tapOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  bufferOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 15 },
  controlsContainer: { ...StyleSheet.absoluteFillObject, zIndex: 20, justifyContent: 'space-between' },

  topBar: { flexDirection: 'row', alignItems: 'center', position: 'absolute', left: 0, right: 0, zIndex: 25 },
  flex1: { flex: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  centerControls: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40, zIndex: 25 },
  centerIconBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  playPauseBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(143, 61, 102, 0.9)', alignItems: 'center', justifyContent: 'center' },

  bottomBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 25 },
  timeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', width: 48, textAlign: 'center' },
  
  sliderContainer: { flex: 1, height: 40, marginHorizontal: 10, justifyContent: 'center', position: 'relative' },
  sliderTrackBg: { position: 'absolute', left: 15, right: 15, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  sliderBufferedTrack: { position: 'absolute', left: 15, height: 3, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2 },
  slider: { width: '100%', height: 40 },

  lockedStateContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, gap: 8 },
  unlockText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  feedbackContainer: { position: 'absolute', top: '15%', bottom: '15%', width: '40%', alignItems: 'center', justifyContent: 'center', zIndex: 12 },
  feedbackLeft: { left: 0 },
  feedbackRight: { right: 0 },
  feedbackRipple: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', width: 100, height: 100, borderRadius: 50 },
  feedbackText: { color: '#FFF', fontWeight: 'bold', marginTop: 4 },

  /* ── Unified Settings Sheet ── */
  sheetRoot: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 40 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#0D1117', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, minHeight: 250 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sheetBackBtn: { marginRight: 16 },
  sheetTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  sheetOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetOptionRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sheetOptionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sheetOptionSub: { color: '#A0AEC0', fontSize: 14, fontWeight: '500' },

  sheetCheckOption: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetCheckText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
  sheetCheckTextActive: { color: '#FFFFFF', fontWeight: '800' },

  devBuildBadge: { position: 'absolute', left: 12, bottom: 14, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 6 },
  devBuildBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
