const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { getDefaultConfig: getExpoDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const expoConfig = getExpoDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

// Merge RN defaults → Expo defaults → our overrides
module.exports = mergeConfig(defaultConfig, mergeConfig(expoConfig, config));
