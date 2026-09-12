import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

type RegistrationSuccessModalProps = {
  visible: boolean;
  onRequestClose?: () => void;
};

export function RegistrationSuccessModal({ visible, onRequestClose }: RegistrationSuccessModalProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 40, 340);
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { width: cardWidth }]}>
          <View style={styles.hero}>
            <View style={styles.heroArt}>
              <View style={styles.decoDot} />
              <View style={styles.decoStar} />
              <MaterialIcons name="lock" size={40} color="#5EC4BD" style={styles.iconLeft} />
              <View style={styles.phoneFrame}>
                <View style={styles.phoneInner}>
                  <MaterialIcons name="verified-user" size={28} color="#2ECC71" />
                </View>
              </View>
              <MaterialIcons name="credit-card" size={36} color="#E8E8EE" style={styles.iconRight} />
            </View>
          </View>

          <Text style={[styles.title, { color: textPrimary }]}>Successful</Text>
          <Text style={[styles.body, { color: textMuted }]}>
            Your Account is Ready to Use. You will be redirected to the Home Page in a Few Seconds.
          </Text>

          <View style={styles.spinnerWrap}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 10, 28, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingBottom: 28,
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 16,
  },
  hero: {
    marginHorizontal: -22,
    marginBottom: 8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  heroArt: {
    height: 160,
    backgroundColor: '#EEF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  decoDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFB74D',
    top: 18,
    left: 28,
  },
  decoStar: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4,
    backgroundColor: '#FFD54F',
    top: 44,
    right: 36,
  },
  iconLeft: {
    position: 'absolute',
    left: 18,
    bottom: 28,
  },
  iconRight: {
    position: 'absolute',
    right: 14,
    bottom: 26,
  },
  phoneFrame: {
    width: 72,
    height: 100,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C4B896',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  spinnerWrap: {
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
