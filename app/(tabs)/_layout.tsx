import { Tabs, usePathname, useSegments } from 'expo-router';
import React from 'react';

import { AnimatedTabBar } from '@/components/ui/animated-tab-bar';
import { useDoubleBackExit } from '@/hooks/use-double-back-exit';

export default function TabLayout() {
  const pathname = usePathname();
  const segments = useSegments();
  const isHomeTab =
    segments[0] === '(tabs)' &&
    (segments.length === 1 || segments[1] === 'index' || pathname === '/(tabs)' || pathname === '/(tabs)/index');

  useDoubleBackExit({
    enabled: isHomeTab,
    message: 'Press again, exit now',
    intervalMs: 2000,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Learn',
        }}
      />
      <Tabs.Screen
        name="my-learning"
        options={{
          title: 'My Learning',
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Bookmarks',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
