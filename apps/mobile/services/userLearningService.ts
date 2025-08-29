import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

interface UserSwingData {
  id: string;
  timestamp: Date;
  imageBase64: string;
  analysisResult: any;
  userFeedback?: {
    accuracy: number; // 1-5 점
    helpful: boolean;
    corrections?: string[];
    actualImprovement?: number;
  };
  swingMetadata: {
    clubType: string;
    weather?: string;
    courseLocation?: string;
    shotResult?: 'excellent' | 'good' | 'fair' | 'poor';
    distance?: number;
    direction?: 'straight' | 'left' | 'right';
  };
}

interface UserProfile {
  userId: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  averageScore: number;
  commonIssues: string[];
  strengths: string[];
  swingHistory: UserSwingData[];
  personalizedModel?: {
    version: string;
    accuracy: number;
    lastUpdated: Date;
    trainingDataCount: number;
  };
}

interface LearningMetrics {
  totalAnalyses: number;
  averageAccuracy: number;
  improvementRate: number;
  mostCommonIssues: Map<string, number>;
  recommendedFocus: string[];
}

class UserLearningService {
  private userProfile: UserProfile | null = null;
  private learningQueue: UserSwingData[] = [];
  private modelVersion = '1.0.0';
  private readonly MIN_DATA_FOR_RETRAINING = 50;
  private readonly FEEDBACK_WEIGHT = 0.3;

  async initializeUser(userId: string): Promise<void> {
    try {
      // 로컬 저장소에서 사용자 프로필 로드
      const storedProfile = await AsyncStorage.getItem(`user_profile_${userId}`);

      if (storedProfile) {
        this.userProfile = JSON.parse(storedProfile);
        await this.checkForModelUpdate();
      } else {
        // 새 사용자 프로필 생성
        this.userProfile = {
          userId,
          skillLevel: 'beginner',
          averageScore: 100,
          commonIssues: [],
          strengths: [],
          swingHistory: [],
        };
        await this.saveProfile();
      }
    } catch (error) {
      console.error('Failed to initialize user profile:', error);
    }
  }

  // 스윙 분석 결과 저장 및 학습
  async recordSwingAnalysis(
    imageBase64: string,
    analysisResult: any,
    metadata?: any
  ): Promise<void> {
    if (!this.userProfile) return;

    const swingData: UserSwingData = {
      id: `swing_${Date.now()}`,
      timestamp: new Date(),
      imageBase64,
      analysisResult,
      swingMetadata: {
        clubType: metadata?.clubType || 'driver',
        weather: metadata?.weather,
        courseLocation: metadata?.location,
        shotResult: metadata?.result,
        distance: metadata?.distance,
        direction: metadata?.direction,
      },
    };

    // 스윙 히스토리에 추가
    this.userProfile.swingHistory.push(swingData);
    this.learningQueue.push(swingData);

    // 패턴 분석
    await this.analyzePatterns();

    // 일정 데이터가 쌓이면 재학습 트리거
    if (this.learningQueue.length >= 10) {
      await this.triggerIncrementalLearning();
    }

    await this.saveProfile();
  }

  // 사용자 피드백 수집
  async collectUserFeedback(
    swingId: string,
    feedback: {
      accuracy: number;
      helpful: boolean;
      corrections?: string[];
      actualImprovement?: number;
    }
  ): Promise<void> {
    if (!this.userProfile) return;

    const swingIndex = this.userProfile.swingHistory.findIndex((s) => s.id === swingId);
    if (swingIndex !== -1) {
      this.userProfile.swingHistory[swingIndex].userFeedback = feedback;

      // 피드백 기반 모델 조정
      await this.adjustModelBasedOnFeedback(feedback);

      await this.saveProfile();
    }
  }

  // 패턴 분석 및 개인화
  private async analyzePatterns(): Promise<void> {
    if (!this.userProfile || this.userProfile.swingHistory.length < 5) return;

    const recentSwings = this.userProfile.swingHistory.slice(-20);

    // 공통 문제점 찾기
    const issueFrequency = new Map<string, number>();
    recentSwings.forEach((swing) => {
      swing.analysisResult.professional_feedback?.forEach((feedback: any) => {
        if (feedback.priority === 'high' || feedback.priority === 'medium') {
          const count = issueFrequency.get(feedback.category) || 0;
          issueFrequency.set(feedback.category, count + 1);
        }
      });
    });

    // 상위 3개 문제점
    this.userProfile.commonIssues = Array.from(issueFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue]) => issue);

    // 강점 파악
    const strengths: string[] = [];
    recentSwings.forEach((swing) => {
      if (swing.analysisResult.overall_score > 80) {
        if (swing.analysisResult.posture_score > 85) strengths.push('자세');
        if (swing.analysisResult.balance_score > 85) strengths.push('균형');
        if (swing.analysisResult.angle_score > 85) strengths.push('각도');
      }
    });

    this.userProfile.strengths = [...new Set(strengths)].slice(0, 3);

    // 스킬 레벨 자동 조정
    const avgScore =
      recentSwings.reduce((sum, s) => sum + (s.analysisResult.overall_score || 0), 0) /
      recentSwings.length;

    if (avgScore > 85) this.userProfile.skillLevel = 'advanced';
    else if (avgScore > 70) this.userProfile.skillLevel = 'intermediate';
    else this.userProfile.skillLevel = 'beginner';
  }

  // 증분 학습 (Incremental Learning)
  private async triggerIncrementalLearning(): Promise<void> {
    if (this.learningQueue.length === 0) return;

    try {
      // 서버로 학습 데이터 전송
      const response = await fetch(`${API_ENDPOINTS.personalAI}/retrain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userProfile?.userId,
          trainingData: this.learningQueue.map((swing) => ({
            image: swing.imageBase64,
            labels: this.enhanceLabelsWithFeedback(swing),
            metadata: swing.swingMetadata,
          })),
          currentModel: this.userProfile?.personalizedModel,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // 개인화 모델 업데이트
        if (this.userProfile) {
          this.userProfile.personalizedModel = {
            version: result.modelVersion,
            accuracy: result.accuracy,
            lastUpdated: new Date(),
            trainingDataCount: this.userProfile.swingHistory.length,
          };
        }

        // 학습 큐 비우기
        this.learningQueue = [];

        console.log(`Model retrained: v${result.modelVersion}, Accuracy: ${result.accuracy}%`);
      }
    } catch (error) {
      console.error('Failed to trigger retraining:', error);
      // 오프라인시 로컬에 저장
      await this.saveTrainingQueueLocally();
    }
  }

  // 피드백 기반 라벨 개선
  private enhanceLabelsWithFeedback(swing: UserSwingData): any {
    const baseLabels = swing.analysisResult;

    if (swing.userFeedback) {
      // 사용자 피드백으로 정확도 조정
      const accuracyMultiplier = swing.userFeedback.accuracy / 5;

      return {
        ...baseLabels,
        overall_score: baseLabels.overall_score * accuracyMultiplier,
        confidence: accuracyMultiplier,
        userCorrections: swing.userFeedback.corrections || [],
        actualResult: swing.swingMetadata.shotResult,
        wasHelpful: swing.userFeedback.helpful,
      };
    }

    return baseLabels;
  }

  // 피드백 기반 모델 조정
  private async adjustModelBasedOnFeedback(feedback: any): Promise<void> {
    if (!this.userProfile) return;

    // 낮은 정확도 피드백시 가중치 조정
    if (feedback.accuracy < 3) {
      // 해당 분석 유형의 신뢰도를 낮춤
      await this.updateModelWeights({
        adjustment: 'decrease',
        factor: feedback.accuracy / 5,
        categories: feedback.corrections || [],
      });
    } else if (feedback.accuracy > 4) {
      // 높은 정확도시 해당 패턴 강화
      await this.updateModelWeights({
        adjustment: 'increase',
        factor: feedback.accuracy / 5,
        categories: [],
      });
    }
  }

  // 모델 가중치 업데이트
  private async updateModelWeights(params: any): Promise<void> {
    try {
      await fetch(`${API_ENDPOINTS.personalAI}/adjust-weights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userProfile?.userId,
          ...params,
        }),
      });
    } catch (error) {
      console.error('Failed to update model weights:', error);
    }
  }

  // 개인화된 분석 실행
  async analyzeWithPersonalization(imageBase64: string): Promise<any> {
    if (!this.userProfile?.personalizedModel) {
      // 개인화 모델이 없으면 일반 분석
      return null;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.personalAI}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userProfile.userId,
          image: imageBase64,
          modelVersion: this.userProfile.personalizedModel.version,
          userContext: {
            skillLevel: this.userProfile.skillLevel,
            commonIssues: this.userProfile.commonIssues,
            strengths: this.userProfile.strengths,
            recentHistory: this.userProfile.swingHistory.slice(-5),
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // 개인화된 추천 추가
        result.personalizedRecommendations = this.generatePersonalizedTips();
        result.improvementTracking = this.calculateImprovement();

        return result;
      }
    } catch (error) {
      console.error('Personalized analysis failed:', error);
    }

    return null;
  }

  // 개인화된 팁 생성
  private generatePersonalizedTips(): string[] {
    if (!this.userProfile) return [];

    const tips: string[] = [];

    // 공통 문제점 기반 팁
    this.userProfile.commonIssues.forEach((issue) => {
      switch (issue) {
        case '상체 자세':
          tips.push('최근 상체 자세에서 반복적인 문제가 발견됩니다. 어깨 회전에 집중해보세요.');
          break;
        case '하체 안정성':
          tips.push('하체 안정성 개선이 필요합니다. 스쿼트 운동을 추천합니다.');
          break;
        case '임팩트':
          tips.push('임팩트 순간 일관성이 부족합니다. 느린 스윙으로 감각을 익혀보세요.');
          break;
      }
    });

    // 스킬 레벨별 팁
    switch (this.userProfile.skillLevel) {
      case 'beginner':
        tips.push('기초 자세부터 차근차근 익혀가고 있습니다. 꾸준히 연습하세요!');
        break;
      case 'intermediate':
        tips.push('중급 수준에 도달했습니다. 이제 세부 기술을 다듬을 때입니다.');
        break;
      case 'advanced':
        tips.push('상급자 수준입니다. 미세한 조정으로 프로 수준에 도전해보세요.');
        break;
    }

    return tips;
  }

  // 개선도 계산
  private calculateImprovement(): number {
    if (!this.userProfile || this.userProfile.swingHistory.length < 10) return 0;

    const recentSwings = this.userProfile.swingHistory.slice(-10);
    const olderSwings = this.userProfile.swingHistory.slice(-20, -10);

    if (olderSwings.length === 0) return 0;

    const recentAvg =
      recentSwings.reduce((sum, s) => sum + (s.analysisResult.overall_score || 0), 0) /
      recentSwings.length;
    const olderAvg =
      olderSwings.reduce((sum, s) => sum + (s.analysisResult.overall_score || 0), 0) /
      olderSwings.length;

    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }

  // 학습 메트릭스 가져오기
  async getLearningMetrics(): Promise<LearningMetrics> {
    if (!this.userProfile) {
      return {
        totalAnalyses: 0,
        averageAccuracy: 0,
        improvementRate: 0,
        mostCommonIssues: new Map(),
        recommendedFocus: [],
      };
    }

    const issueMap = new Map<string, number>();
    this.userProfile.commonIssues.forEach((issue) => {
      issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
    });

    return {
      totalAnalyses: this.userProfile.swingHistory.length,
      averageAccuracy: this.userProfile.personalizedModel?.accuracy || 75,
      improvementRate: this.calculateImprovement(),
      mostCommonIssues: issueMap,
      recommendedFocus: this.userProfile.commonIssues,
    };
  }

  // 모델 업데이트 확인
  private async checkForModelUpdate(): Promise<void> {
    try {
      const response = await fetch(`${API_ENDPOINTS.personalAI}/check-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentVersion: this.modelVersion,
          userId: this.userProfile?.userId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.updateAvailable) {
          this.modelVersion = data.newVersion;
          console.log(`Model updated to v${data.newVersion}`);
        }
      }
    } catch (error) {
      console.error('Failed to check for model updates:', error);
    }
  }

  // 프로필 저장
  private async saveProfile(): Promise<void> {
    if (!this.userProfile) return;

    try {
      await AsyncStorage.setItem(
        `user_profile_${this.userProfile.userId}`,
        JSON.stringify(this.userProfile)
      );
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  }

  // 오프라인 학습 큐 저장
  private async saveTrainingQueueLocally(): Promise<void> {
    try {
      await AsyncStorage.setItem('training_queue', JSON.stringify(this.learningQueue));
    } catch (error) {
      console.error('Failed to save training queue:', error);
    }
  }

  // 학습 데이터 내보내기 (GDPR 준수)
  async exportUserData(): Promise<string> {
    if (!this.userProfile) return '';

    return JSON.stringify(
      {
        profile: this.userProfile,
        metrics: await this.getLearningMetrics(),
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );
  }

  // 학습 데이터 삭제 (GDPR 준수)
  async deleteAllUserData(): Promise<void> {
    if (!this.userProfile) return;

    await AsyncStorage.removeItem(`user_profile_${this.userProfile.userId}`);
    await AsyncStorage.removeItem('training_queue');

    this.userProfile = null;
    this.learningQueue = [];
  }
}

export default new UserLearningService();
