import React, { useEffect } from 'react';
import { Dimensions, Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const ACCENT = '#8F3D66';

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
      opacity.value = withTiming(1, { duration: 400 });
      scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });

      lockRotation.value = withDelay(500, withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 50 })
      ));

      lockTranslateY.value = withDelay(800, withTiming(-100, { duration: 600, easing: Easing.in(Easing.exp) }));

      setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 800);

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
      { rotate: `${lockRotation.value}deg` },
    ],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onFinished}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.container, containerStyle]}>
          <View style={styles.card}>
            <Animated.View style={[styles.lockCircle, lockStyle]}>
              <MaterialIcons name="lock-open" size={48} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.successText}>Content Unlocked!</Text>
            <Text style={styles.titleText} numberOfLines={2}>{title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PREMIUM ACCESS</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
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
    backgroundColor: 'rgba(30, 20, 30, 0.96)',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: width * 0.8,
    borderWidth: 1,
    borderColor: 'rgba(143, 61, 102, 0.6)',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  lockCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(143, 61, 102, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: ACCENT,
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
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
