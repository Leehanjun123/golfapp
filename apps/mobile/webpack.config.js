const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@react-navigation', 'react-native-reanimated']
      }
    },
    argv
  );
  
  // Customize the config before returning it
  return config;
};