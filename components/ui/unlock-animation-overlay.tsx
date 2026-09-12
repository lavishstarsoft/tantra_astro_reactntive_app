import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onFinished: () => void;
  title: string;
}

export function UnlockAnimationOverlay({ visible, onFinished, title }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const lockRotation = useSharedValue(0);
  const lockTranslateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Step 1: Fade in
      opacity.value = withTiming(1, { duration: 400 });
      scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });

      // Step 2: Shake lock (anticipation)
      lockRotation.value = withDelay(500, withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 50 })
      ));

      // Step 3: Unlock (jump and fade)
      lockTranslateY.value = withDelay(800, withTiming(-100, { duration: 600, easing: Easing.in(Easing.exp) }));
      
      // Haptics for impact
      setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 800);

      // Step 4: Fade out and finish
      opacity.value = withDelay(2000, withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onFinished)();
        }
      }));
    } else {
      opacity.value = 0;
      scale.value = 0.8;
      lockTranslateY.value = 0;
      lockRotation.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const lockStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lockTranslateY.value },
      { rotate: `${lockRotation.value}deg` }
    ],
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.container, containerStyle]}>
        <View style={styles.card}>
          <Animated.View style={[styles.lockCircle, lockStyle]}>
            <MaterialIcons name="lock-open" size={48} color="#FFD700" />
          </Animated.View>
          <Text style={styles.successText}>Content Unlocked!</Text>
          <Text style={styles.titleText} numberOfLines={2}>{title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PREMIUM ACCESS</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: width * 0.8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  lockCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  successText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
});
