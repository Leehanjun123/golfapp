import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import { ApiConfig } from '../../../config/api';
import { NetworkUtils } from '../../../config/network-utils';

/**
 * Professional API Client with smart connection management, interceptors, retry logic, and error handling
 */
class ApiClientClass {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: any[] = [];
  private currentBaseUrl: string = ApiConfig.getBaseUrl();
  private connectionRetries: number = 0;
  private maxRetries: number = 3;

  constructor() {
    this.instance = axios.create({
      baseURL: this.currentBaseUrl,
      timeout: ApiConfig.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initializeSmartConnection();
  }

  /**
   * 스마트 연결 초기화 - 백그라운드에서 최적의 URL 찾기
   */
  private async initializeSmartConnection() {
    try {
      const smartUrl = await ApiConfig.getSmartBaseUrl();
      if (smartUrl !== this.currentBaseUrl) {
        await this.updateBaseUrl(smartUrl);
        console.log(`🔄 API client updated to: ${smartUrl}`);
      }
    } catch (error) {
      console.warn('⚠️ Smart connection initialization failed:', error);
    }
  }

  /**
   * Base URL 업데이트 및 연결 테스트
   */
  private async updateBaseUrl(newBaseUrl: string): Promise<boolean> {
    try {
      // 연결 테스트
      const isConnected = await NetworkUtils.testConnection(newBaseUrl);
      if (isConnected) {
        this.currentBaseUrl = newBaseUrl;
        this.instance.defaults.baseURL = newBaseUrl;
        this.connectionRetries = 0;
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`⚠️ Failed to update base URL to ${newBaseUrl}:`, error);
      return false;
    }
  }

  /**
   * 연결 실패 시 자동 폴백 처리
   */
  private async handleConnectionFailure(): Promise<void> {
    if (this.connectionRetries >= this.maxRetries) {
      throw new Error('Max connection retries exceeded');
    }

    this.connectionRetries++;
    console.warn(`⚠️ Connection failed, attempting fallback (${this.connectionRetries}/${this.maxRetries})...`);

    try {
      // 다른 호스트 후보들 시도
      const candidates = NetworkUtils.getHostCandidates();
      for (const host of candidates) {
        const candidateUrl = `http://${host}:8080/api/v1`;
        if (candidateUrl === this.currentBaseUrl) continue;

        const success = await this.updateBaseUrl(candidateUrl);
        if (success) {
          console.log(`✅ Fallback successful: ${candidateUrl}`);
          return;
        }
      }

      throw new Error('No working API endpoints found');
    } catch (error) {
      console.error('❌ All fallback attempts failed:', error);
      throw error;
    }
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      async (config) => {
        // Update base URL if needed
        if (config.baseURL !== this.currentBaseUrl) {
          config.baseURL = this.currentBaseUrl;
        }

        // Add auth token (commented out as AuthService import was removed)
        // const token = await AuthService.getAccessToken();
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }

        // Add device info
        config.headers['X-Device-Platform'] = Platform.OS;
        config.headers['X-Device-Version'] = Platform.Version;
        config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Log request in dev mode
        if (__DEV__) {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        // Reset connection retry counter on successful response
        this.connectionRetries = 0;
        
        if (__DEV__) {
          console.log(`✅ API Response: ${response.config.url}`, response.status);
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle network/connection errors with smart fallback
        if (!error.response) {
          console.warn(`🔌 Network error detected: ${error.message}`);
          
          try {
            await this.handleConnectionFailure();
            // Retry the original request with new base URL
            originalRequest.baseURL = this.currentBaseUrl;
            return this.instance(originalRequest);
          } catch (fallbackError) {
            throw new Error('Unable to connect to any API server. Please check your network connection.');
          }
        }

        // Handle 401 - Token refresh (disabled for now)
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.warn('🔐 Authentication required');
          // TODO: Implement token refresh when auth service is available
          throw new Error('Authentication required. Please log in again.');
        }

        // Handle 5xx server errors with potential fallback
        if (error.response?.status >= 500 && this.connectionRetries < this.maxRetries) {
          console.warn(`🚨 Server error ${error.response.status}, trying fallback...`);
          try {
            await this.handleConnectionFailure();
            originalRequest.baseURL = this.currentBaseUrl;
            return this.instance(originalRequest);
          } catch (fallbackError) {
            console.error('❌ Fallback failed for server error');
          }
        }

        // Handle other errors
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           `HTTP ${error.response?.status}: An unexpected error occurred`;

        if (__DEV__) {
          console.error(`❌ API Error: ${error.config?.url}`, {
            status: error.response?.status,
            data: error.response?.data,
            baseURL: error.config?.baseURL
          });
        }

        throw new Error(errorMessage);
      }
    );
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  /**
   * Get current connection info
   */
  getConnectionInfo() {
    return {
      baseUrl: this.currentBaseUrl,
      retries: this.connectionRetries,
      maxRetries: this.maxRetries,
      isHealthy: this.connectionRetries === 0,
    };
  }

  /**
   * Force connection refresh
   */
  async refreshConnection(): Promise<void> {
    ApiConfig.clearCache();
    NetworkUtils.clearCache();
    await this.initializeSmartConnection();
  }

  // HTTP Methods with enhanced error handling
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }
}

export const ApiClient = new ApiClientClass();