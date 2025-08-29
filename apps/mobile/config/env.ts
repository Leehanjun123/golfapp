import Constants from 'expo-constants';

interface Environment {
  API_URL: string;
  ENV: 'development' | 'production' | 'preview';
  ENABLE_ANALYTICS: boolean;
  SENTRY_DSN?: string;
}

const ENV: Environment = {
  API_URL: 'https://golfapp-gamma.vercel.app/api',
  ENV: 'production',
  ENABLE_ANALYTICS: false,
  SENTRY_DSN: undefined,
};

export default ENV;
