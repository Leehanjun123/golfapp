// Golf Pro - API Client Utilities

import { API_ENDPOINTS, APP_CONFIG } from './constants';
import { asyncUtils } from './utils';

// ===========================================
// API Client Configuration
// ===========================================
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  defaultHeaders?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  error_code?: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  code: string;
  status?: number;
  details?: any;
}

// ===========================================
// HTTP Methods
// ===========================================
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method: HttpMethod;
  endpoint: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// ===========================================
// API Client Class
// ===========================================
export class ApiClient {
  private config: ApiClientConfig;
  private authToken: string | null = null;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseURL: config.baseURL || 'http://localhost:8080/api/v1',
      timeout: config.timeout || APP_CONFIG.NETWORK.TIMEOUT,
      retryAttempts: config.retryAttempts || APP_CONFIG.NETWORK.RETRY_ATTEMPTS,
      retryDelay: config.retryDelay || APP_CONFIG.NETWORK.RETRY_DELAY,
      defaultHeaders: {
        'Content-Type': 'application/json',
        ...config.defaultHeaders
      }
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Get full URL for endpoint
   */
  private getUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.config.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Get headers with authentication
   */
  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers = {
      ...this.config.defaultHeaders,
      ...customHeaders
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const { method, endpoint, data, params, headers, timeout, retries } = options;

    const requestFn = async (): Promise<ApiResponse<T>> => {
      const url = this.getUrl(endpoint, params);
      const requestHeaders = this.getHeaders(headers);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout || this.config.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          let errorData: any;
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }

          throw new ApiError({
            message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            code: errorData.error_code || 'HTTP_ERROR',
            status: response.status,
            details: errorData
          });
        }

        // Parse response
        const responseText = await response.text();
        const responseData = responseText ? JSON.parse(responseText) : {};

        return {
          success: true,
          data: responseData.data || responseData,
          timestamp: new Date().toISOString(),
          ...responseData
        };

      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new ApiError({
            message: '요청 시간이 초과되었습니다',
            code: 'TIMEOUT_ERROR'
          });
        }

        if (error instanceof ApiError) {
          throw error;
        }

        throw new ApiError({
          message: error.message || '네트워크 오류가 발생했습니다',
          code: 'NETWORK_ERROR',
          details: error
        });
      }
    };

    // Apply retry logic
    return asyncUtils.retry(requestFn, {
      retries: retries || this.config.retryAttempts,
      delay: this.config.retryDelay,
      backoff: 2
    });
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>, options: Partial<RequestOptions> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'GET',
      endpoint,
      params,
      ...options
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, options: Partial<RequestOptions> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'POST',
      endpoint,
      data,
      ...options
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, options: Partial<RequestOptions> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'PUT',
      endpoint,
      data,
      ...options
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: Partial<RequestOptions> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'DELETE',
      endpoint,
      ...options
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any, options: Partial<RequestOptions> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'PATCH',
      endpoint,
      data,
      ...options
    });
  }
}

// ===========================================
// API Error Class
// ===========================================
export class ApiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: any;

  constructor(options: {
    message: string;
    code: string;
    status?: number;
    details?: any;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

// ===========================================
// API Client Factory
// ===========================================
export const createApiClient = (config?: Partial<ApiClientConfig>): ApiClient => {
  return new ApiClient(config);
};

// ===========================================
// Default API Client Instance
// ===========================================
export const apiClient = createApiClient();

// ===========================================
// Convenient API Methods
// ===========================================
export const apiMethods = {
  // Authentication
  login: (credentials: { email: string; password: string }) =>
    apiClient.post(API_ENDPOINTS.LOGIN, credentials),

  register: (userData: { email: string; username: string; password: string; name?: string }) =>
    apiClient.post(API_ENDPOINTS.REGISTER, userData),

  refreshToken: (refreshToken: string) =>
    apiClient.post(API_ENDPOINTS.REFRESH_TOKEN, { refreshToken }),

  logout: () =>
    apiClient.post(API_ENDPOINTS.LOGOUT),

  // User Management
  getUserProfile: () =>
    apiClient.get(API_ENDPOINTS.USER_PROFILE),

  updateUserProfile: (userData: any) =>
    apiClient.put(API_ENDPOINTS.USER_UPDATE, userData),

  getUserStats: () =>
    apiClient.get(API_ENDPOINTS.USER_STATS),

  // Swing Analysis
  analyzeSwing: (imageData: string) =>
    apiClient.post(API_ENDPOINTS.ANALYZE_SWING, { image: imageData }),

  getSwingHistory: (params?: { page?: number; limit?: number }) =>
    apiClient.get(API_ENDPOINTS.SWING_HISTORY, params),

  compareSwings: (swingId1: string, swingId2: string) =>
    apiClient.post(API_ENDPOINTS.SWING_COMPARE, { swingId1, swingId2 }),

  // Challenges
  getChallenges: (params?: { type?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get(API_ENDPOINTS.CHALLENGES_LIST, params),

  joinChallenge: (challengeId: string) =>
    apiClient.post(API_ENDPOINTS.CHALLENGE_JOIN, { challengeId }),

  getChallengeLeaderboard: (challengeId: string) =>
    apiClient.get(`${API_ENDPOINTS.CHALLENGE_LEADERBOARD}/${challengeId}`),

  // Social
  getFriends: () =>
    apiClient.get(API_ENDPOINTS.FRIENDS_LIST),

  addFriend: (friendId: string) =>
    apiClient.post(API_ENDPOINTS.FRIENDS_ADD, { friendId }),

  getSocialFeed: (params?: { page?: number; limit?: number }) =>
    apiClient.get(API_ENDPOINTS.FEED, params),

  // Goals
  getGoals: () =>
    apiClient.get(API_ENDPOINTS.GOALS_LIST),

  createGoal: (goalData: any) =>
    apiClient.post(API_ENDPOINTS.GOALS_CREATE, goalData),

  updateGoal: (goalId: string, goalData: any) =>
    apiClient.put(`${API_ENDPOINTS.GOALS_UPDATE}/${goalId}`, goalData)
};