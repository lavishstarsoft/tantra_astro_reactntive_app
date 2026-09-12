import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePurchase } from '@/providers/purchase-provider';
import { useNotifications } from '@/providers/notification-provider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams();
  const { syncPurchases } = usePurchase();
  const { refresh: refreshNotifications } = useNotifications();
  const hasNavigated = useRef(false);

  const status = readParam(params.status) ?? 'success';
  const target = readParam(params.target) ?? '';
  const kind = readParam(params.kind) ?? 'video';
  const isSuccess = status === 'success';

  // Animation values
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.6);
  const cardOpacity = useSharedValue(0);
  const lockRotation = useSharedValue(0);
  const lockTranslateY = useSharedValue(0);
  const lockOpacity = useSharedValue(1);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const badgeScale = useSharedValue(0);
  const shimmerTranslateX = useSharedValue(-SCREEN_WIDTH);

  const navigateAway = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (isSuccess && target) {
      if (kind === 'category') {
        router.replace(`/category/${encodeURIComponent(target)}` as any);
      } else {
        router.replace(`/video/${encodeURIComponent(target)}` as any);
      }
    } else {
      if (target) {
        if (kind === 'category') {
          router.replace(`/category/${encodeURIComponent(target)}` as any);
        } else {
          router.replace(`/video/${encodeURIComponent(target)}` as any);
        }
      } else {
        router.replace('/(tabs)' as any);
      }
    }
  };

  useEffect(() => {
    void syncPurchases();
    void refreshNotifications();

    if (isSuccess) {
      // Phase 1: Overlay fade in
      overlayOpacity.value = withTiming(1, { duration: 300 });

      // Phase 2: Card appears with spring
      cardScale.value = withDelay(200, withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.7)) }));
      cardOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));

      // Phase 3: Lock shakes (anticipation)
      lockRotation.value = withDelay(800, withSequence(
        withTiming(-15, { duration: 60 }),
        withTiming(15, { duration: 80 }),
        withTiming(-12, { duration: 80 }),
        withTiming(10, { duration: 60 }),
        withTiming(0, { duration: 40 })
      ));

      // Phase 4: Haptic feedback + lock flies up
      setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 1200);

      lockTranslateY.value = withDelay(1200, withTiming(-80, { duration: 500, easing: Easing.in(Easing.cubic) }));
      lockOpacity.value = withDelay(1400, withTiming(0, { duration: 300 }));

      // Phase 5: Check mark appears
      checkScale.value = withDelay(1500, withTiming(1, { duration: 400, easing: Easing.out(Easing.back(2)) }));
      checkOpacity.value = withDelay(1500, withTiming(1, { duration: 300 }));

      // Phase 6: Title slides up
      titleOpacity.value = withDelay(1700, withTiming(1, { duration: 400 }));
      titleTranslateY.value = withDelay(1700, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));

      // Phase 7: Badge pops
      badgeScale.value = withDelay(2000, withTiming(1, { duration: 300, easing: Easing.out(Easing.back(2.5)) }));

      // Phase 8: Shimmer across card
      shimmerTranslateX.value = withDelay(2200, withTiming(SCREEN_WIDTH, { duration: 800, easing: Easing.inOut(Easing.cubic) }));

      // Phase 9: Navigate away after animation
      setTimeout(() => {
        runOnJS(navigateAway)();
      }, 3500);
    } else {
      // Failed payment - show quickly and go home
      overlayOpacity.value = withTiming(1, { duration: 300 });
      cardScale.value = withTiming(1, { duration: 400 });
      cardOpacity.value = withTiming(1, { duration: 300 });
      checkScale.value = withDelay(400, withTiming(1, { duration: 300 }));
      checkOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
      titleOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
      titleTranslateY.value = withDelay(500, withTiming(0, { duration: 300 }));

      setTimeout(() => {
        runOnJS(navigateAway)();
      }, 3000);
    }
  }, []);

  // Animated styles
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const lockStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lockTranslateY.value },
      { rotate: `${lockRotation.value}deg` },
    ],
    opacity: lockOpacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Shimmer effect */}
        <Animated.View style={[styles.shimmer, shimmerStyle]} />

        {/* Lock icon (visible first, then flies away) */}
        {isSuccess && (
          <Animated.View style={[styles.iconCircle, styles.lockCircle, lockStyle]}>
            <MaterialIcons name="lock" size={44} color="#FFD700" />
          </Animated.View>
        )}

        {/* Check/X icon (appears after lock flies away) */}
        <Animated.View
          style={[
            styles.iconCircle,
            isSuccess ? styles.successCircle : styles.failCircle,
            checkStyle,
            isSuccess ? styles.checkAbsolute : undefined,
          ]}>
          <MaterialIcons
            name={isSuccess ? 'lock-open' : 'error-outline'}
            size={44}
            color={isSuccess ? '#FFD700' : '#FF4D6A'}
          />
        </Animated.View>

        {/* Title */}
        <Animated.View style={titleStyle}>
          <Text style={styles.title}>
            {isSuccess ? 'Content Unlocked!' : 'Payment Failed'}
          </Text>
          <Text style={styles.subtitle}>
            {isSuccess
              ? target
                ? `"${target}" is now available for you.`
                : 'Your content is now available.'
              : 'Something went wrong. Please try again.'}
          </Text>
        </Animated.View>

        {/* Badge */}
        {isSuccess && (
          <Animated.View style={[styles.badge, badgeStyle]}>
            <MaterialIcons name="verified" size={14} color="#0F172A" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>PREMIUM ACCESS GRANTED</Text>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 30, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: '#1A2233',
    borderRadius: 32,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    transform: [{ skewX: '-15deg' }],
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  lockCircle: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  successCircle: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  failCircle: {
    backgroundColor: 'rgba(255, 77, 106, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 77, 106, 0.4)',
  },
  checkAbsolute: {
    position: 'absolute',
    top: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.2,
  },
});
