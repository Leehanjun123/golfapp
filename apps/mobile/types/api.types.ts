// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// User Types
export interface User {
  id: string;
  name: string;
  email?: string;
  level: number;
  title: string;
  memberSince: string;
  avatarUrl?: string;
}

export interface UserStats {
  averageScore: number;
  driveDistance: number;
  handicap: number;
  totalRounds: number;
  bestScore: number;
  improvementRate: number;
  totalSwingsAnalyzed?: number;
  averageSimilarity?: number;
  challengesCompleted?: number;
  totalPoints?: number;
  globalRank?: number;
}

export interface UserProfile {
  profile: User;
  stats: UserStats;
  achievements: Achievement[];
  recentActivity: Activity[];
}

// Golf Analysis Types
export interface SwingAnalysis {
  similarityScore: number;
  improvements: string[];
  strengths: string[];
  videoUrl?: string;
  analyzedAt?: string;
  // Enhanced professional analysis fields
  overall_score: number;
  posture_score: number;
  balance_score: number;
  angle_score: number;
  pose_detected: boolean;
  pose_keypoints?: Array<{ x: number; y: number; confidence: number }>;
  club_analysis?: ClubAnalysis;
  detailed_angles?: DetailedAngles;
  professional_feedback?: ProfessionalFeedback[];
  swing_phases?: SwingPhase[];
}

export interface ClubAnalysis {
  club_type: string;
  face_angle: number;
  club_path: string;
  ball_direction: string;
  impact_quality: number;
  estimated_distance?: number;
}

export interface DetailedAngles {
  shoulder_tilt: number;
  left_arm_angle: number;
  right_arm_angle: number;
  hip_rotation: number;
  left_knee_bend: number;
  right_knee_bend: number;
  spine_tilt: number;
  balance_score: number;
  weight_distribution: {
    left: number;
    right: number;
  };
}

export interface ProfessionalFeedback {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  solution: string;
  impact_on_game: string;
}

export interface SwingPhase {
  name: string;
  score: number;
  comment: string;
  key_points: string[];
  timing_ms?: number;
}

export interface ProGolfer {
  id: string;
  name: string;
  nationality: string;
  signatureMoves: string[];
  profileImage?: string;
  biography?: string;
}

export interface ProComparisonResult {
  similarityScore: number;
  improvements: string[];
  strengths: string[];
  proGolfer: ProGolfer;
  comparisonDate?: string;
}

// Challenge Types
export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  participants: number;
  maxParticipants: number;
  rewardPoints: number;
  endDate: string;
  startDate?: string;
  myRank?: number;
  myScore?: number;
  leaderboard?: LeaderboardEntry[];
  isJoined?: boolean;
  isCompleted?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userName: string;
  score: number;
  isCurrentUser?: boolean;
  avatarUrl?: string;
}

export interface ChallengeStats {
  totalChallenges: number;
  completedChallenges: number;
  totalPoints: number;
  bestRank: number;
  badges: string[];
  winRate?: number;
}

// AI Coach Types
export interface AICoachMessage {
  message: string;
  personality: 'friendly' | 'encouraging' | 'analytical' | 'strict';
  timestamp?: string;
}

export interface AICoachResponse {
  response: string;
  suggestions: string[];
  conversationId: string;
  personality: string;
  timestamp: string;
  confidence?: number;
}

// Achievement Types
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockedDate: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress?: number;
  maxProgress?: number;
}

// Activity Types
export interface Activity {
  id: string;
  type: 'swing_analysis' | 'challenge_completed' | 'achievement_unlocked' | 'lesson_completed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Media Types
export interface MediaFile {
  uri: string;
  type: 'image' | 'video';
  thumbnail?: string;
  duration?: number;
  size?: number;
  createdAt?: string;
}
