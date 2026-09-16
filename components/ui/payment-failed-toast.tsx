import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  visible: boolean;
  message?: string;
  onHide: () => void;
};

export function PaymentFailedToast({ visible, message, onHide }: Props) {
  const translateY = useSharedValue(-140);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    translateY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 260 });

    // Auto-dismiss after ~3.2s.
    opacity.value = withDelay(3200, withTiming(0, { duration: 300 }));
    translateY.value = withDelay(
      3200,
      withTiming(-140, { duration: 320, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onHide)();
      })
    );
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <SafeAreaView pointerEvents="none" style={styles.safe} edges={['top']}>
      <Animated.View style={[styles.toast, animStyle]}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="error-outline" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Payment Failed</Text>
          <Text style={styles.subtitle}>{message ?? 'Payment was not completed. Please try again.'}</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#B3213B',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    maxWidth: 520,
    alignSelf: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: 1 },
});
