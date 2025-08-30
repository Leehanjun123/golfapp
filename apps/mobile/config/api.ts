// API Configuration - Professional Network-Aware Setup
import { Platform } from 'react-native';
import ENV from './env';
import { NetworkUtils } from './network-utils';

// 스마트 API URL 캐싱
let cachedApiUrl: string | null = null;
let urlCacheTime: number = 0;
const URL_CACHE_DURATION = 60000; // 1분

// 지능형 API URL 결정
const getSmartBaseUrl = async (): Promise<string> => {
  // 캐시 확인
  if (cachedApiUrl && Date.now() - urlCacheTime < URL_CACHE_DURATION) {
    return cachedApiUrl;
  }

  try {
    // Production 환경
    if (ENV.ENV !== 'development') {
      cachedApiUrl = `${ENV.API_URL}`;
      urlCacheTime = Date.now();
      return cachedApiUrl;
    }

    // 개발 환경: 네트워크 기반 최적 URL
    const optimalUrl = await NetworkUtils.getOptimalBaseUrl();
    
    // 연결 테스트
    const isConnected = await NetworkUtils.testConnection(optimalUrl);
    
    if (isConnected) {
      console.log(`✅ API connected: ${optimalUrl}`);
      cachedApiUrl = optimalUrl;
      urlCacheTime = Date.now();
      return optimalUrl;
    }

    // 폴백: 다른 호스트 시도
    console.warn('⚠️ Primary host failed, trying alternatives...');
    const candidates = NetworkUtils.getHostCandidates();
    const fastestHost = await NetworkUtils.findFastestHost(candidates);
    
    const fallbackUrl = `http://${fastestHost}:8080/api`;
    console.log(`🔄 Using fallback: ${fallbackUrl}`);
    
    cachedApiUrl = fallbackUrl;
    urlCacheTime = Date.now();
    return fallbackUrl;

  } catch (error) {
    console.error('❌ Failed to determine API URL:', error);
    // 최종 폴백
    const defaultUrl = `http://localhost:8080/api`;
    cachedApiUrl = defaultUrl;
    urlCacheTime = Date.now();
    return defaultUrl;
  }
};

// 동기적 접근을 위한 초기 URL (즉시 사용 가능)
const getInitialBaseUrl = (): string => {
  if (ENV.ENV !== 'development') {
    return `${ENV.API_URL}`;
  }
  
  // 개발 환경 기본값
  if (Platform.OS === 'web') {
    return 'http://localhost:8080/api';
  }
  
  // 환경변수 우선 사용
  const envHost = process.env.EXPO_PUBLIC_API_HOST;
  if (envHost) {
    return `http://${envHost}:8080/api`;
  }
  
  return 'http://localhost:8080/api';
};

const API_BASE_URL = getInitialBaseUrl();

// 비동기 URL 업데이트 (백그라운드)
if (__DEV__) {
  getSmartBaseUrl().then(smartUrl => {
    if (smartUrl !== API_BASE_URL) {
      console.log(`🔄 API URL updated: ${API_BASE_URL} → ${smartUrl}`);
      cachedApiUrl = smartUrl;
    }
  }).catch(error => {
    console.warn('⚠️ Smart URL detection failed:', error);
  });
}

// 디버깅용 로그
console.log('Platform:', Platform.OS);
console.log('Initial API_BASE_URL:', API_BASE_URL);
console.log('ENV:', ENV);

// API Configuration Export
export const ApiConfig = {
  getBaseUrl: () => cachedApiUrl || API_BASE_URL,
  getSmartBaseUrl,
  clearCache: () => {
    cachedApiUrl = null;
    urlCacheTime = 0;
    NetworkUtils.clearCache();
  },
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: URL_CACHE_DURATION,
};

export const API_ENDPOINTS = {
  // Golf AI
  proComparison: `${API_BASE_URL}/golf/pro-comparison`,
  aiCoach: `${API_BASE_URL}/golf/ai-coach/chat`,

  // User
  profile: `${API_BASE_URL}/users/profile`,
  stats: `${API_BASE_URL}/users/stats`,

  // Analysis
  swingAnalysis: `${API_BASE_URL}/golf/analyze-swing`,
  videoAnalysis: `${API_BASE_URL}/video/analyze`,
  realtimeAnalysis: `${API_BASE_URL}/golf/analyze-realtime`,
  liveAnalysis: `${API_BASE_URL}/golf/analyze-live`,
  gestureDetection: `${API_BASE_URL}/gesture/detect-hand`,


  // Friends & Social (consolidated)
  friends: `${API_BASE_URL}/social?feature=friends`,
  leaderboard: `${API_BASE_URL}/social?feature=leaderboard`,
  chat: `${API_BASE_URL}/social?feature=chat`,

  // Features (consolidated)
  goals: `${API_BASE_URL}/features?feature=goals`,
  challenges: `${API_BASE_URL}/features?feature=challenges`,
  personalAI: `${API_BASE_URL}/features?feature=personal-ai`,

  // Authentication
  auth: `${API_BASE_URL}/auth`,
};

// API 요청 헬퍼 함수
export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

export default API_BASE_URL;
