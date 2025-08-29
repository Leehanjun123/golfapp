// Golf Pro - Shared Constants

// ===========================================
// API Constants
// ===========================================
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH_TOKEN: '/auth/refresh',
  LOGOUT: '/auth/logout',
  
  // User Management
  USER_PROFILE: '/users/profile',
  USER_STATS: '/users/stats',
  USER_UPDATE: '/users/update',
  
  // Swing Analysis
  ANALYZE_SWING: '/analysis/swing',
  SWING_HISTORY: '/analysis/history',
  SWING_COMPARE: '/analysis/compare',
  
  // Challenges
  CHALLENGES_LIST: '/challenges',
  CHALLENGE_JOIN: '/challenges/join',
  CHALLENGE_LEADERBOARD: '/challenges/leaderboard',
  
  // Social
  FRIENDS_LIST: '/social/friends',
  FRIENDS_ADD: '/social/friends/add',
  FEED: '/social/feed',
  
  // Goals
  GOALS_LIST: '/goals',
  GOALS_CREATE: '/goals/create',
  GOALS_UPDATE: '/goals/update'
} as const;

// ===========================================
// Golf Analysis Constants
// ===========================================
export const GOLF_CONSTANTS = {
  // Score ranges
  SCORE_RANGES: {
    EXCELLENT: { min: 90, max: 100, label: '완벽함' },
    GOOD: { min: 75, max: 89, label: '좋음' },
    FAIR: { min: 60, max: 74, label: '보통' },
    NEEDS_WORK: { min: 40, max: 59, label: '개선 필요' },
    POOR: { min: 0, max: 39, label: '많은 연습 필요' }
  },
  
  // Swing phases
  SWING_PHASES: [
    'address',
    'takeaway', 
    'backswing',
    'top',
    'downswing',
    'impact',
    'follow_through',
    'finish'
  ] as const,
  
  // Analysis accuracy thresholds
  ACCURACY_THRESHOLDS: {
    HIGH_CONFIDENCE: 95,
    MEDIUM_CONFIDENCE: 85,
    LOW_CONFIDENCE: 70,
    INSUFFICIENT: 50
  },
  
  // Processing limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ANALYSIS_TIME: 5000, // 5 seconds
  MAX_RETRIES: 3
} as const;

// ===========================================
// UI Constants
// ===========================================
export const UI_CONSTANTS = {
  // Colors
  COLORS: {
    PRIMARY: '#4CAF50',
    SECONDARY: '#2196F3',
    SUCCESS: '#4CAF50',
    WARNING: '#FF9800',
    ERROR: '#F44336',
    INFO: '#2196F3',
    
    // Golf-specific colors
    GOLF_GREEN: '#228B22',
    FAIRWAY: '#90EE90',
    ROUGH: '#8B4513',
    SAND: '#F4A460',
    WATER: '#4169E1',
    
    // Neutral colors
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    GRAY_LIGHT: '#F5F5F5',
    GRAY_MEDIUM: '#BDBDBD',
    GRAY_DARK: '#757575'
  },
  
  // Spacing
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48
  },
  
  // Typography
  FONT_SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
    XXXL: 32
  },
  
  // Dimensions
  BUTTON_HEIGHT: {
    SMALL: 32,
    MEDIUM: 44,
    LARGE: 56
  },
  
  INPUT_HEIGHT: 44,
  HEADER_HEIGHT: 56,
  TAB_BAR_HEIGHT: 60,
  
  // Animation durations
  ANIMATION: {
    FAST: 150,
    MEDIUM: 250,
    SLOW: 350
  }
} as const;

// ===========================================
// App Configuration
// ===========================================
export const APP_CONFIG = {
  NAME: 'Golf Pro',
  VERSION: '1.0.0',
  
  // Feature flags
  FEATURES: {
    CAMERA_ENABLED: true,
    PUSH_NOTIFICATIONS: false,
    ANALYTICS: false,
    MOCK_DATA: false,
    OFFLINE_MODE: true
  },
  
  // Cache settings
  CACHE: {
    USER_DATA_TTL: 24 * 60 * 60 * 1000, // 24 hours
    ANALYSIS_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    CHALLENGES_TTL: 60 * 60 * 1000, // 1 hour
    MAX_CACHE_SIZE: 50 * 1024 * 1024 // 50MB
  },
  
  // Network settings
  NETWORK: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
  }
} as const;

// ===========================================
// Validation Constants
// ===========================================
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  
  // Golf-specific validation
  HANDICAP_MIN: -10,
  HANDICAP_MAX: 54,
  SCORE_MIN: 50,
  SCORE_MAX: 200,
  DISTANCE_MIN: 50,
  DISTANCE_MAX: 400
} as const;

// ===========================================
// Error Messages
// ===========================================
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요',
  TIMEOUT_ERROR: '요청 시간이 초과되었습니다',
  UNAUTHORIZED: '인증이 필요합니다',
  FORBIDDEN: '접근 권한이 없습니다',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다',
  SERVER_ERROR: '서버 오류가 발생했습니다',
  VALIDATION_ERROR: '입력 정보를 확인해주세요',
  
  // Golf-specific errors
  CAMERA_NOT_AVAILABLE: '카메라를 사용할 수 없습니다',
  ANALYSIS_FAILED: '스윙 분석에 실패했습니다',
  INVALID_IMAGE: '유효한 이미지를 선택해주세요',
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다 (최대 10MB)',
  
  // Form validation
  EMAIL_INVALID: '올바른 이메일 주소를 입력해주세요',
  PASSWORD_TOO_SHORT: '비밀번호는 최소 8자 이상이어야 합니다',
  USERNAME_REQUIRED: '사용자명을 입력해주세요',
  PASSWORDS_NOT_MATCH: '비밀번호가 일치하지 않습니다'
} as const;