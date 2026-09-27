import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type PricingTier = { days: number; amountCents: number; label: string };

type Props = {
  visible: boolean;
  tiers: PricingTier[];
  title?: string;
  accent?: string;
  onSelect: (index: number) => void;
  onClose: () => void;
};

const { height } = Dimensions.get('window');

function rupees(amountCents: number) {
  const r = Math.round(amountCents / 100);
  return `₹${r.toLocaleString('en-IN')}`;
}

function daysLabel(days: number) {
  if (days <= 0) return 'Lifetime';
  if (days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
  if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? 's' : ''}`;
  return `${days} days`;
}

export function PricingTierSheet({ visible, tiers, title, accent = '#8F3D66', onSelect, onClose }: Props) {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(height);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView style={styles.sheetWrap} edges={['bottom']} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title ?? 'Choose a plan'}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color="#666" />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Pick a validity that suits you. Pay once, watch till it expires.</Text>

          <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
            {tiers.map((t, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.row, { borderColor: accent }, pressed && { backgroundColor: '#faf5f8' }]}
                onPress={() => onSelect(i)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t.label?.trim() || daysLabel(t.days)}</Text>
                  <Text style={styles.rowDays}>{daysLabel(t.days)} access</Text>
                </View>
                <View style={[styles.pricePill, { backgroundColor: accent }]}>
                  <Text style={styles.priceText}>{rupees(t.amountCents)}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6D3D1',
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#1E1B1E' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 13, color: '#78716C', marginTop: 2, marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rowLabel: { fontSize: 16, fontWeight: '700', color: '#1E1B1E' },
  rowDays: { fontSize: 12.5, color: '#78716C', marginTop: 2 },
  pricePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  priceText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
