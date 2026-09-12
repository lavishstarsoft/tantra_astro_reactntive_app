import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
};

export function AnimatedLoadingPopup({ visible, title = 'Please wait', subtitle }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [visible, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <ActivityIndicator size="large" color="#C0C6CF" />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    minWidth: 250,
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: '#191326',
    borderWidth: 1,
    borderColor: '#3A2B52',
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#F1F3F5',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    color: '#C0C6CF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

