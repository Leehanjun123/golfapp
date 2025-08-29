// Golf AI - Network Utilities for Dynamic IP Detection

import { Platform } from 'react-native';
import * as Network from 'expo-network';
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
    
    return `http://${host}:${port}/api/v1`;
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

      // 네트워크 정보 가져오기
      const networkState = await Network.getNetworkStateAsync();
      
      if (!networkState.isConnected) {
        console.warn('⚠️ No network connection, using localhost');
        return 'localhost';
      }

      // 실제 네트워크 IP 가져오기 (Expo Go 지원)
      const ipAddress = await Network.getIpAddressAsync();
      
      if (ipAddress && this.isValidIP(ipAddress)) {
        console.log(`🌐 Detected network IP: ${ipAddress}`);
        this.cachedIP = ipAddress;
        this.ipCacheTime = Date.now();
        return ipAddress;
      }

    } catch (error) {
      console.warn('⚠️ Failed to get network IP:', error);
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

      const response = await fetch(`${baseUrl.replace('/api/v1', '')}/health`, {
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
   * 네트워크 환경 진단
   */
  static async diagnoseNetwork(): Promise<{
    isConnected: boolean;
    type: string;
    ipAddress: string | null;
    recommendedHost: string;
  }> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const ipAddress = await Network.getIpAddressAsync();
      const recommendedHost = await this.getOptimalHost();

      return {
        isConnected: networkState.isConnected || false,
        type: networkState.type || 'unknown',
        ipAddress,
        recommendedHost,
      };
    } catch (error) {
      return {
        isConnected: false,
        type: 'error',
        ipAddress: null,
        recommendedHost: 'localhost',
      };
    }
  }

  /**
   * 개발 환경에서 사용 가능한 모든 호스트 후보 생성
   */
  static getHostCandidates(): string[] {
    const candidates = [
      'localhost',
      '127.0.0.1',
      '10.0.2.2', // Android Emulator
      '10.0.0.2',  // iOS Simulator
    ];

    // 환경변수에서 추가 후보들
    const envHost = process.env.EXPO_PUBLIC_API_HOST;
    if (envHost && !candidates.includes(envHost)) {
      candidates.unshift(envHost);
    }

    // 일반적인 로컬 네트워크 IP 범위
    const commonRanges = [
      '192.168.',
      '10.0.',
      '172.16.',
    ];

    // 현재 IP가 감지되면 같은 서브넷의 게이트웨이 추가
    if (this.cachedIP) {
      const ipParts = this.cachedIP.split('.');
      if (ipParts.length === 4) {
        const gateway = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.1`;
        if (!candidates.includes(gateway)) {
          candidates.splice(1, 0, gateway);
        }
      }
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

// 개발 환경에서 네트워크 진단 실행
if (__DEV__) {
  NetworkUtils.diagnoseNetwork().then(diagnosis => {
    console.log('🌐 Network Diagnosis:', diagnosis);
  }).catch(error => {
    console.error('❌ Network diagnosis failed:', error);
  });
}