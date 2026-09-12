import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';

const ICON_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  index: 'home',
  explore: 'view-list',
  'my-learning': 'school',
  bookmarks: 'bookmark-border',
  profile: 'account-circle',
};

const A11Y_TAB_LABEL: Record<string, string> = {
  index: 'Home',
  explore: 'Learn',
  'my-learning': 'My Learning',
  bookmarks: 'Bookmarks',
  profile: 'Profile',
};

export function AnimatedTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const safe = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, safe.bottom);
  const paddingBottom = Math.max(bottomInset, 8) + 8;
  const tabBg = useThemeColor({}, 'appTabBg');
  const tabBorder = useThemeColor({}, 'appTabBorder');
  const activeIcon = useThemeColor({}, 'appTabIconActive');
  const idleIcon = useThemeColor({}, 'appTabIconIdle');
  const activePill = useThemeColor({}, 'appAccentSoft');
  const activePillBorder = useThemeColor({}, 'appBorder');

  return (
    <View style={[styles.wrap, { paddingBottom, backgroundColor: tabBg, borderTopColor: tabBorder }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <TabBarItem
            key={route.key}
            routeName={route.name}
            accessibilityLabel={A11Y_TAB_LABEL[route.name] ?? route.name}
            isFocused={isFocused}
            onPress={onPress}
            activeIcon={activeIcon}
            idleIcon={idleIcon}
            activePill={activePill}
            activePillBorder={activePillBorder}
          />
        );
      })}
    </View>
  );
}

function TabBarItem({
  routeName,
  accessibilityLabel,
  isFocused,
  onPress,
  activeIcon,
  idleIcon,
  activePill,
  activePillBorder,
}: {
  routeName: string;
  accessibilityLabel: string;
  isFocused: boolean;
  onPress: () => void;
  activeIcon: string;
  idleIcon: string;
  activePill: string;
  activePillBorder: string;
}) {
  // Keep ring + fill on the active tab via normal styles so every tab gets the same
  // silver circle when focused (Reanimated borderColor timing can miss updates on some tabs).
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(isFocused ? 1 : 0.98, { duration: 220 }) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isFocused }}>
      <Animated.View
        style={[
          styles.pill,
          isFocused
            ? [styles.pillActive, { backgroundColor: activePill, borderColor: activePillBorder }]
            : styles.pillIdle,
          scaleStyle,
        ]}>
        <MaterialIcons
          name={ICON_MAP[routeName] ?? 'radio-button-unchecked'}
          size={24}
          color={isFocused ? activeIcon : idleIcon}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    minHeight: 56,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIdle: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: {
    borderWidth: 1,
  },
});
