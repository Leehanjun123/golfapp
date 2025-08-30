// Golf AI - Network Utilities (Simplified without expo-network)

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * 네트워크 환경에 따른 최적의 API URL을 자동으로 결정하는 유틸리티
 */
export class NetworkUtils {
  private static cachedIP: string | null = null;
  private static ipCacheTime: number = 0;
  private static readonly IP_CACHE_DURATION = 30000; // 30초

  /**
   * 현재 네트워크 환경에 최적화된 API 기본 URL 반환
   */
  static async getOptimalBaseUrl(): Promise<string> {
    // Production 환경
    if (Constants.expoConfig?.extra?.API_BASE_URL && !__DEV__) {
      return Constants.expoConfig.extra.API_BASE_URL;
    }

    // 개발 환경에서 동적 IP 감지
    const host = await this.getOptimalHost();
    const port = Constants.expoConfig?.extra?.API_PORT || process.env.PORT || '8080';
    
    return `http://${host}:${port}/api`;
  }

  /**
   * 플랫폼과 네트워크 상황에 최적화된 호스트 반환
   */
  private static async getOptimalHost(): Promise<string> {
    // 캐시된 IP가 있고 아직 유효하면 사용
    if (this.cachedIP && Date.now() - this.ipCacheTime < this.IP_CACHE_DURATION) {
      return this.cachedIP;
    }

    try {
      // 웹 플랫폼
      if (Platform.OS === 'web') {
        return 'localhost';
      }

      // Android Emulator
      if (Platform.OS === 'android' && __DEV__) {
        return '10.0.2.2';
      }

      // iOS Simulator or Physical Device
      if (Platform.OS === 'ios') {
        // 환경변수나 설정에서 IP 가져오기
        const envHost = process.env.EXPO_PUBLIC_API_HOST || Constants.expoConfig?.extra?.API_HOST;
        if (envHost) {
          return envHost;
        }
        // 로컬 개발시 Mac IP 사용
        return '192.168.45.217'; // 실제 Mac IP로 변경 필요
      }

    } catch (error) {
      console.warn('⚠️ Failed to determine optimal host:', error);
    }

    // 폴백: 환경변수 또는 기본값
    const fallbackIP = Constants.expoConfig?.extra?.FALLBACK_IP || 
                      process.env.EXPO_PUBLIC_API_HOST || 
                      'localhost';
    
    console.log(`🔄 Using fallback IP: ${fallbackIP}`);
    return fallbackIP;
  }

  /**
   * IP 주소 유효성 검사
   */
  private static isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip) && !ip.startsWith('127.') && !ip.startsWith('169.254.');
  }

  /**
   * 서버 연결 상태 확인
   */
  static async testConnection(baseUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${baseUrl.replace('/api', '')}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Connection test failed:', error);
      return false;
    }
  }

  /**
   * 여러 호스트 후보 중 가장 빠른 것 선택
   */
  static async findFastestHost(candidates: string[]): Promise<string> {
    const testPromises = candidates.map(async (host) => {
      const startTime = Date.now();
      try {
        const baseUrl = `http://${host}:8080`;
        const isConnected = await this.testConnection(baseUrl);
        const responseTime = Date.now() - startTime;
        
        return {
          host,
          isConnected,
          responseTime,
        };
      } catch {
        return {
          host,
          isConnected: false,
          responseTime: Infinity,
        };
      }
    });

    const results = await Promise.all(testPromises);
    const connectedHosts = results
      .filter(r => r.isConnected)
      .sort((a, b) => a.responseTime - b.responseTime);

    if (connectedHosts.length > 0) {
      console.log(`🚀 Fastest host found: ${connectedHosts[0].host} (${connectedHosts[0].responseTime}ms)`);
      return connectedHosts[0].host;
    }

    // 연결된 호스트가 없으면 첫 번째 후보 반환
    console.warn('⚠️ No connected hosts found, using first candidate');
    return candidates[0] || 'localhost';
  }

  /**
   * 개발 환경에서 사용 가능한 모든 호스트 후보 생성
   */
  static getHostCandidates(): string[] {
    const candidates = [
      'localhost',
      '127.0.0.1',
      '10.0.2.2', // Android Emulator
      '192.168.45.217', // Your Mac IP
    ];

    // 환경변수에서 추가 후보들
    const envHost = process.env.EXPO_PUBLIC_API_HOST;
    if (envHost && !candidates.includes(envHost)) {
      candidates.unshift(envHost);
    }

    return candidates;
  }

  /**
   * IP 캐시 초기화
   */
  static clearCache(): void {
    this.cachedIP = null;
    this.ipCacheTime = 0;
  }
}