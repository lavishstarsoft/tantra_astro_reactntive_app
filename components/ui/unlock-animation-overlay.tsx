import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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

// Uses React Native's Animated (works inside <Modal>, unlike Reanimated) and
// renders the card visible by default so the popup always shows.
export function UnlockAnimationOverlay({ visible, onFinished, title }: Props) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const lockLift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    scale.setValue(0.85);
    lockLift.setValue(0);

    Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(lockLift, {
        toValue: 1,
        duration: 500,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const t = setTimeout(onFinished, 2600);
    return () => clearTimeout(t);
  }, [visible]);

  const lockTranslate = lockLift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onFinished}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onFinished}>
        <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <Animated.View style={[styles.lockCircle, { transform: [{ translateY: lockTranslate }] }]}>
              <MaterialIcons name="lock-open" size={48} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.successText}>Content Unlocked!</Text>
            <Text style={styles.titleText} numberOfLines={2}>{title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PREMIUM ACCESS</Text>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: 'rgba(30, 20, 30, 0.97)',
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
    elevation: 12,
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
  successText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  titleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  badge: { backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
});
