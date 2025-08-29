import Constants from 'expo-constants';

interface Environment {
  API_URL: string;
  ENV: 'development' | 'production' | 'preview';
  ENABLE_ANALYTICS: boolean;
  SENTRY_DSN?: string;
}

const ENV: Environment = {
  API_URL:
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:8080',
  ENV: (Constants.expoConfig?.extra?.EXPO_PUBLIC_ENV ||
    process.env.EXPO_PUBLIC_ENV ||
    'development') as Environment['ENV'],
  ENABLE_ANALYTICS:
    Constants.expoConfig?.extra?.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true' ||
    process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true' ||
    false,
  SENTRY_DSN:
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN,
};

export default ENV;
