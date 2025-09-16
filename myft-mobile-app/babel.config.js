module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        'expo-router/babel',            // recommended with expo-router (safe to keep)
        'react-native-reanimated/plugin'// MUST be last
      ],
    };
  };