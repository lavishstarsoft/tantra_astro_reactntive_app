import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export const BACK_NAV_BUTTON_SIZE = 36;

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
  hitSlop?: number;
};

/**
 * Shared circular back control (matches video details header).
 */
export function BackNavButton({
  onPress,
  accessibilityLabel = 'Go back',
  hitSlop = 12,
}: Props) {
  const border = useThemeColor({}, 'appBorder');
  const surface = useThemeColor({}, 'appSurface');
  const textPrimary = useThemeColor({}, 'appTextPrimary');

  return (
    <Pressable
      style={[styles.btn, { borderColor: border, backgroundColor: surface }]}
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <MaterialIcons name="arrow-back" size={20} color={textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: BACK_NAV_BUTTON_SIZE,
    height: BACK_NAV_BUTTON_SIZE,
    borderRadius: BACK_NAV_BUTTON_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
