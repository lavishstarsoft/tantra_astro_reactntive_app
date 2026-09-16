import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  message?: string;
  onHide: () => void;
};

// React Native Animated (works inside <Modal>, unlike Reanimated).
export function PaymentFailedToast({ visible, message, onHide }: Props) {
  const translateY = useRef(new Animated.Value(-160)).current;

  useEffect(() => {
    if (!visible) return;

    translateY.setValue(-160);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const t = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -160,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onHide();
      });
    }, 3200);

    return () => clearTimeout(t);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onHide}>
      <SafeAreaView pointerEvents="none" style={styles.safe} edges={['top']}>
        <Animated.View style={[styles.toast, { transform: [{ translateY }] }]}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="error-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>Payment Failed</Text>
            <Text style={styles.subtitle}>
              {message ?? 'Payment was not completed. Please try again.'}
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
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
