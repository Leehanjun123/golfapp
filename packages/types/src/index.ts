// Golf Pro - Shared TypeScript Types

// ===========================================
// User & Authentication Types
// ===========================================
export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  handicap: number;
  averageScore: number;
  driveDistance: number;
  totalRounds: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  name?: string;
}

// ===========================================
// Golf Analysis Types
// ===========================================
export interface SwingAnalysis {
  id: string;
  userId: string;
  score: number;
  postureScore: number;
  balanceScore: number;
  angleScore: number;
  feedback: string[];
  improvements: string[];
  pose: PoseAnalysis;
  processing: ProcessingMetadata;
  createdAt: Date;
}

export interface PoseAnalysis {
  shoulderRotation: number;
  hipRotation: number;
  xFactor: number;
  spineAngle: number;
  weightShift: number;
  clubPath: number;
  tempo: number;
}

export interface ProcessingMetadata {
  time: string;
  method: string;
  accuracy: string;
  dataSource: string;
  focus: string;
  aiVersion?: string;
  processingMode: 'local' | 'cloud' | 'hybrid';
}

// ===========================================
// API Response Types
// ===========================================
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  error_code?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===========================================
// Challenge & Social Types
// ===========================================
export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  duration: number; // in days
  participants: number;
  reward: string;
  status: ChallengeStatus;
  createdAt: Date;
  expiresAt: Date;
}

export type ChallengeType = 
  | 'accuracy'
  | 'distance'
  | 'consistency'
  | 'technique'
  | 'daily_practice';

export type ChallengeDifficulty = 
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'professional';

export type ChallengeStatus = 
  | 'active'
  | 'completed'
  | 'expired'
  | 'draft';

// ===========================================
// Navigation Types
// ===========================================
export type RootStackParamList = {
  Home: undefined;
  SwingAnalysis: {
    imageData?: string;
    videoData?: string;
  };
  ProComparison: {
    userSwingId?: string;
  };
  AICoach: undefined;
  Challenges: undefined;
  Profile: undefined;
  Login: undefined;
  Register: undefined;
  Settings: undefined;
};

// ===========================================
// Component Props Types
// ===========================================
export interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// ===========================================
// Configuration Types
// ===========================================
export interface AppConfig {
  apiBaseUrl: string;
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    enableCamera: boolean;
    enablePushNotifications: boolean;
    enableAnalytics: boolean;
    enableMockData: boolean;
  };
}

// ===========================================
// Error Types
// ===========================================
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
}

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'CAMERA_ERROR'
  | 'ANALYSIS_ERROR';