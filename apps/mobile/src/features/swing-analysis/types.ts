/**
 * Type definitions for Swing Analysis feature
 * Following TypeScript best practices with strict typing
 */

export interface ProGolfer {
  id: string;
  name: string;
  nameKorean: string;
  nationality: string;
  style: string;
  averageDriveDistance: number;
  signatureMoves: string[];
  profileImageUrl?: string;
}

export interface SwingComparisonRequest {
  mediaUri: string;
  mediaType: 'image' | 'video';
  proGolferId: string;
}

export interface SwingAnalysisResult {
  id: string;
  similarityScore: number;
  grade: Grade;
  strengths: AnalysisPoint[];
  improvements: AnalysisPoint[];
  proGolfer: ProGolfer;
  analyzedAt: Date;
  mediaUrl?: string;
}

export interface AnalysisPoint {
  id: string;
  category: AnalysisCategory;
  description: string;
  priority: Priority;
  tips?: string[];
}

export type Grade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D';

export type AnalysisCategory = 
  | 'backswing'
  | 'downswing'
  | 'impact'
  | 'follow-through'
  | 'posture'
  | 'grip'
  | 'balance';

export type Priority = 'high' | 'medium' | 'low';

export interface MediaSelection {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number;
}

export interface CameraPermissions {
  camera: boolean;
  microphone: boolean;
}