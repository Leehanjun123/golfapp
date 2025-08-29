// Golf AI - Smart API Connection Hook

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ApiConfig } from '../config/api';
import { NetworkUtils } from '../config/network-utils';

interface ApiConnectionState {
  baseUrl: string;
  isConnected: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  error: string | null;
}

interface ConnectionTestResult {
  url: string;
  isConnected: boolean;
  responseTime: number;
  error?: string;
}

/**
 * 스마트 API 연결 관리 훅
 * - 자동 네트워크 감지
 * - 연결 상태 실시간 모니터링
 * - 앱 포그라운드/백그라운드 전환 시 재연결
 * - 연결 품질 평가
 */
export const useApiConnection = () => {
  const [state, setState] = useState<ApiConnectionState>({
    baseUrl: ApiConfig.getBaseUrl(),
    isConnected: false,
    isChecking: true,
    lastChecked: null,
    connectionQuality: 'offline',
    error: null,
  });

  const checkTimeoutRef = useRef<NodeJS.Timeout>();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const retryCountRef = useRef<number>(0);

  /**
   * 연결 품질 평가
   */
  const evaluateConnectionQuality = (responseTime: number): ApiConnectionState['connectionQuality'] => {
    if (responseTime < 200) return 'excellent';
    if (responseTime < 500) return 'good';
    if (responseTime < 1000) return 'poor';
    return 'offline';
  };

  /**
   * API 연결 테스트
   */
  const testConnection = useCallback(async (url?: string): Promise<ConnectionTestResult> => {
    const testUrl = url || state.baseUrl;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${testUrl.replace('/api/v1', '')}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          url: testUrl,
          isConnected: true,
          responseTime,
        };
      } else {
        return {
          url: testUrl,
          isConnected: false,
          responseTime,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        url: testUrl,
        isConnected: false,
        responseTime,
        error: error.name === 'AbortError' ? 'Timeout' : error.message,
      };
    }
  }, [state.baseUrl]);

  /**
   * 최적의 API URL 찾기
   */
  const findBestConnection = useCallback(async (): Promise<string> => {
    try {
      // 현재 URL 먼저 테스트
      const currentResult = await testConnection();
      if (currentResult.isConnected) {
        return state.baseUrl;
      }

      // 스마트 URL 감지 시도
      const smartUrl = await ApiConfig.getSmartBaseUrl();
      if (smartUrl !== state.baseUrl) {
        const smartResult = await testConnection(smartUrl);
        if (smartResult.isConnected) {
          console.log(`🔄 Switching to smart URL: ${smartUrl}`);
          return smartUrl;
        }
      }

      // 다른 호스트 후보들 시도
      const candidates = NetworkUtils.getHostCandidates();
      for (const host of candidates) {
        const candidateUrl = `http://${host}:8080/api/v1`;
        if (candidateUrl === state.baseUrl || candidateUrl === smartUrl) {
          continue; // 이미 테스트한 URL은 건너뛰기
        }

        const result = await testConnection(candidateUrl);
        if (result.isConnected) {
          console.log(`✅ Found working connection: ${candidateUrl}`);
          return candidateUrl;
        }
      }

      // 연결 가능한 호스트가 없음
      throw new Error('No available API hosts found');
    } catch (error) {
      console.error('❌ Failed to find best connection:', error);
      return state.baseUrl; // 기존 URL 유지
    }
  }, [state.baseUrl, testConnection]);

  /**
   * 연결 상태 확인 및 업데이트
   */
  const checkConnection = useCallback(async (force: boolean = false) => {
    // 이미 확인 중이면 건너뛰기 (force가 아닌 경우)
    if (!force && state.isChecking) {
      return;
    }

    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // 현재 URL 테스트
      const result = await testConnection();

      if (result.isConnected) {
        // 연결 성공
        setState(prev => ({
          ...prev,
          isConnected: true,
          isChecking: false,
          lastChecked: new Date(),
          connectionQuality: evaluateConnectionQuality(result.responseTime),
          error: null,
        }));
        retryCountRef.current = 0;
      } else {
        // 연결 실패 - 다른 URL 시도
        console.warn(`⚠️ Connection failed to ${state.baseUrl}:`, result.error);
        
        const bestUrl = await findBestConnection();
        const finalResult = await testConnection(bestUrl);

        setState(prev => ({
          ...prev,
          baseUrl: bestUrl,
          isConnected: finalResult.isConnected,
          isChecking: false,
          lastChecked: new Date(),
          connectionQuality: finalResult.isConnected 
            ? evaluateConnectionQuality(finalResult.responseTime)
            : 'offline',
          error: finalResult.isConnected ? null : finalResult.error || 'Connection failed',
        }));

        // 재시도 카운터 업데이트
        if (!finalResult.isConnected) {
          retryCountRef.current++;
        } else {
          retryCountRef.current = 0;
        }
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        connectionQuality: 'offline',
        error: error.message,
      }));
      retryCountRef.current++;
    }
  }, [state.baseUrl, state.isChecking, testConnection, findBestConnection]);

  /**
   * 수동 재연결
   */
  const reconnect = useCallback(async () => {
    ApiConfig.clearCache();
    await checkConnection(true);
  }, [checkConnection]);

  /**
   * 주기적 연결 확인 설정
   */
  const scheduleNextCheck = useCallback(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // 재시도 간격 (지수 백오프)
    const baseInterval = 10000; // 10초
    const maxInterval = 60000; // 60초
    const retryMultiplier = Math.min(Math.pow(2, retryCountRef.current), 6);
    const interval = Math.min(baseInterval * retryMultiplier, maxInterval);

    checkTimeoutRef.current = setTimeout(() => {
      if (AppState.currentState === 'active') {
        checkConnection();
      }
      scheduleNextCheck();
    }, interval);
  }, [checkConnection]);

  /**
   * 앱 상태 변경 핸들러
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    const prevAppState = appStateRef.current;
    appStateRef.current = nextAppState;

    // 포그라운드로 복귀 시 연결 확인
    if (prevAppState !== 'active' && nextAppState === 'active') {
      console.log('📱 App became active, checking connection...');
      checkConnection(true);
    }
  }, [checkConnection]);

  // 초기 설정 및 이벤트 리스너
  useEffect(() => {
    // 초기 연결 확인
    checkConnection(true);

    // 앱 상태 리스너
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // 주기적 확인 시작
    scheduleNextCheck();

    // 정리
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      appStateSubscription?.remove();
    };
  }, [checkConnection, handleAppStateChange, scheduleNextCheck]);

  return {
    ...state,
    testConnection,
    reconnect,
    checkConnection: () => checkConnection(true),
    isRetrying: retryCountRef.current > 0,
    retryCount: retryCountRef.current,
  };
};