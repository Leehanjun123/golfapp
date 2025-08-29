const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Minimal config to prevent EMFILE error
config.watchFolders = [];
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [],
};

module.exports = config;
