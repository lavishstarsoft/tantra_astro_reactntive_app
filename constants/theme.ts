/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    appBg: '#F4F6FA',
    appSurface: '#FFFFFF',
    appSurfaceAlt: '#EEF2F8',
    appBorder: '#D8DEE8',
    appTextPrimary: '#1A2230',
    appTextSecondary: '#4C5A70',
    appTextMuted: '#6E7B8F',
    appAccent: '#8F3D66',
    appAccentSoft: '#F6E9F0',
    appTabBg: '#FFFFFF',
    appTabBorder: '#D8DEE8',
    appTabIconActive: '#8F3D66',
    appTabIconIdle: '#78849A',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    appBg: '#120A1C',
    appSurface: '#1A1027',
    appSurfaceAlt: '#140E1E',
    appBorder: '#322147',
    appTextPrimary: '#F4F7FA',
    appTextSecondary: '#DDE3EA',
    appTextMuted: '#AFA5C0',
    appAccent: '#E85A8A',
    appAccentSoft: '#2A1B3F',
    appTabBg: '#140E1E',
    appTabBorder: '#2B213A',
    appTabIconActive: '#D5DCE6',
    appTabIconIdle: '#726889',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
