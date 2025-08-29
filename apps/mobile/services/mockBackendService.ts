// Mock Backend Service - 실제 백엔드 없이 모든 기능 작동
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
  handicap: number;
  averageScore: number;
  swingCount: number;
  joinDate: Date;
  profileImage?: string;
}

interface SwingData {
  id: string;
  userId: string;
  date: Date;
  score: number;
  videoUrl?: string;
  analysis: any;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  participants: string[];
  startDate: Date;
  endDate: Date;
  prize: string;
  type: 'daily' | 'weekly' | 'monthly';
  status: 'upcoming' | 'active' | 'completed';
}

interface TrainingPlan {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // weeks
  exercises: Exercise[];
  progress: number;
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  videoUrl: string;
  duration: number; // minutes
  repetitions: number;
  completed: boolean;
}

class MockBackendService {
  private users: Map<string, User> = new Map();
  private swingHistory: Map<string, SwingData[]> = new Map();
  private challenges: Challenge[] = [];
  private trainingPlans: TrainingPlan[] = [];
  private friendships: Map<string, string[]> = new Map();
  
  constructor() {
    this.initializeMockData();
  }

  private async initializeMockData() {
    // 프로 골퍼 데이터
    this.initializeProGolfers();
    // 챌린지 데이터
    this.initializeChallenges();
    // 훈련 계획 데이터
    this.initializeTrainingPlans();
    // 로컬 저장소에서 데이터 로드
    await this.loadFromStorage();
  }

  private initializeProGolfers() {
    const proGolfers = [
      {
        id: 'pro_1',
        name: '타이거 우즈',
        handicap: '+8',
        averageScore: 68,
        swingSpeed: 120,
        ballSpeed: 180,
        launchAngle: 10.9,
        spinRate: 2686,
        carryDistance: 295,
        signature: {
          address: { spine: 35, shoulder: 28, hip: 0 },
          backswing: { spine: 30, shoulder: 90, hip: 45 },
          impact: { spine: 25, shoulder: 30, hip: 35 },
          followThrough: { spine: 20, shoulder: -30, hip: 60 }
        }
      },
      {
        id: 'pro_2',
        name: '로리 맥일로이',
        handicap: '+7',
        averageScore: 69,
        swingSpeed: 118,
        ballSpeed: 178,
        launchAngle: 11.2,
        spinRate: 2450,
        carryDistance: 290,
        signature: {
          address: { spine: 33, shoulder: 26, hip: 0 },
          backswing: { spine: 28, shoulder: 95, hip: 48 },
          impact: { spine: 23, shoulder: 28, hip: 38 },
          followThrough: { spine: 18, shoulder: -35, hip: 65 }
        }
      },
      {
        id: 'pro_3',
        name: '더스틴 존슨',
        handicap: '+6.5',
        averageScore: 69.5,
        swingSpeed: 122,
        ballSpeed: 183,
        launchAngle: 10.5,
        spinRate: 2380,
        carryDistance: 300,
        signature: {
          address: { spine: 36, shoulder: 29, hip: 0 },
          backswing: { spine: 32, shoulder: 88, hip: 42 },
          impact: { spine: 27, shoulder: 32, hip: 33 },
          followThrough: { spine: 22, shoulder: -28, hip: 58 }
        }
      }
    ];

    // 프로 골퍼 데이터를 저장
    proGolfers.forEach(pro => {
      AsyncStorage.setItem(`pro_golfer_${pro.id}`, JSON.stringify(pro));
    });
  }

  private initializeChallenges() {
    this.challenges = [
      {
        id: 'ch_1',
        title: '주간 드라이버 챌린지',
        description: '가장 긴 드라이버 샷을 기록하세요!',
        participants: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        prize: '프리미엄 1개월 무료',
        type: 'weekly',
        status: 'active'
      },
      {
        id: 'ch_2',
        title: '정확도 마스터',
        description: '10개 샷 중 가장 일관된 스윙을 보여주세요',
        participants: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        prize: '스윙 분석 50회',
        type: 'daily',
        status: 'active'
      },
      {
        id: 'ch_3',
        title: '월간 개선왕',
        description: '한 달간 가장 많이 개선된 골퍼',
        participants: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        prize: 'AI 코칭 프로 플랜 3개월',
        type: 'monthly',
        status: 'active'
      }
    ];
  }

  private initializeTrainingPlans() {
    this.trainingPlans = [
      {
        id: 'tp_1',
        title: '초보자 기초 다지기',
        level: 'beginner',
        duration: 4,
        progress: 0,
        exercises: [
          {
            id: 'ex_1',
            name: '그립 연습',
            description: '올바른 그립 잡기를 마스터하세요',
            videoUrl: 'https://example.com/grip',
            duration: 15,
            repetitions: 50,
            completed: false
          },
          {
            id: 'ex_2',
            name: '어드레스 자세',
            description: '완벽한 어드레스 자세 만들기',
            videoUrl: 'https://example.com/address',
            duration: 20,
            repetitions: 30,
            completed: false
          },
          {
            id: 'ex_3',
            name: '백스윙 드릴',
            description: '천천히 정확한 백스윙 연습',
            videoUrl: 'https://example.com/backswing',
            duration: 25,
            repetitions: 40,
            completed: false
          }
        ]
      },
      {
        id: 'tp_2',
        title: '중급자 파워 업그레이드',
        level: 'intermediate',
        duration: 6,
        progress: 0,
        exercises: [
          {
            id: 'ex_4',
            name: '하체 회전력 강화',
            description: 'X-Factor 늘리기',
            videoUrl: 'https://example.com/rotation',
            duration: 30,
            repetitions: 50,
            completed: false
          },
          {
            id: 'ex_5',
            name: '래그 만들기',
            description: '다운스윙 래그 연습',
            videoUrl: 'https://example.com/lag',
            duration: 25,
            repetitions: 60,
            completed: false
          },
          {
            id: 'ex_6',
            name: '임팩트 존 훈련',
            description: '정확한 임팩트 구간 만들기',
            videoUrl: 'https://example.com/impact',
            duration: 35,
            repetitions: 70,
            completed: false
          }
        ]
      },
      {
        id: 'tp_3',
        title: '상급자 정밀 컨트롤',
        level: 'advanced',
        duration: 8,
        progress: 0,
        exercises: [
          {
            id: 'ex_7',
            name: '샷 쉐이핑',
            description: '드로우/페이드 컨트롤',
            videoUrl: 'https://example.com/shaping',
            duration: 40,
            repetitions: 100,
            completed: false
          },
          {
            id: 'ex_8',
            name: '거리 컨트롤',
            description: '10야드 단위 거리 조절',
            videoUrl: 'https://example.com/distance',
            duration: 45,
            repetitions: 120,
            completed: false
          },
          {
            id: 'ex_9',
            name: '멘탈 트레이닝',
            description: '압박 상황 시뮬레이션',
            videoUrl: 'https://example.com/mental',
            duration: 30,
            repetitions: 50,
            completed: false
          }
        ]
      }
    ];
  }

  // API 메서드들
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    let user = Array.from(this.users.values()).find(u => u.email === email);
    
    if (!user) {
      // 새 사용자 생성
      user = {
        id: `user_${Date.now()}`,
        name: email.split('@')[0],
        email,
        handicap: 20,
        averageScore: 95,
        swingCount: 0,
        joinDate: new Date()
      };
      this.users.set(user.id, user);
      await this.saveToStorage();
    }

    return {
      user,
      token: `mock_token_${user.id}`
    };
  }

  async getProfile(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);
    await this.saveToStorage();
    
    return updatedUser;
  }

  async getSwingHistory(userId: string): Promise<SwingData[]> {
    return this.swingHistory.get(userId) || [];
  }

  async saveSwingAnalysis(userId: string, analysis: any): Promise<SwingData> {
    const swingData: SwingData = {
      id: `swing_${Date.now()}`,
      userId,
      date: new Date(),
      score: analysis.overall_score || 75,
      analysis
    };

    const history = this.swingHistory.get(userId) || [];
    history.push(swingData);
    this.swingHistory.set(userId, history);

    // 사용자 통계 업데이트
    const user = this.users.get(userId);
    if (user) {
      user.swingCount++;
      user.averageScore = Math.round(
        (user.averageScore * (user.swingCount - 1) + swingData.score) / user.swingCount
      );
      this.users.set(userId, user);
    }

    await this.saveToStorage();
    return swingData;
  }

  async getProGolfers(): Promise<any[]> {
    const pros = [];
    const keys = ['pro_1', 'pro_2', 'pro_3'];
    
    for (const key of keys) {
      const data = await AsyncStorage.getItem(`pro_golfer_${key}`);
      if (data) pros.push(JSON.parse(data));
    }
    
    return pros;
  }

  async compareWithPro(userId: string, proId: string): Promise<any> {
    const userHistory = await this.getSwingHistory(userId);
    const latestSwing = userHistory[userHistory.length - 1];
    const proData = await AsyncStorage.getItem(`pro_golfer_${proId}`);
    
    if (!latestSwing || !proData) {
      throw new Error('Data not found');
    }

    const pro = JSON.parse(proData);
    
    return {
      user: latestSwing.analysis,
      pro: pro,
      comparison: {
        overall: Math.round(((latestSwing.score / 100) * 100)),
        posture: this.calculateSimilarity(
          latestSwing.analysis.detailed_angles,
          pro.signature.address
        ),
        power: Math.round((latestSwing.analysis.club_analysis?.impact_quality || 70) / 100 * 100),
        consistency: Math.random() * 30 + 60 // Mock consistency score
      },
      recommendations: [
        '프로처럼 어깨 회전을 더 크게 가져가세요',
        '임팩트 시 체중 이동을 더 적극적으로',
        '팔로우스루를 더 완전하게 마무리하세요'
      ]
    };
  }

  private calculateSimilarity(userAngles: any, proAngles: any): number {
    // 간단한 유사도 계산
    return Math.round(Math.random() * 20 + 70);
  }

  async getChallenges(): Promise<Challenge[]> {
    return this.challenges;
  }

  async joinChallenge(userId: string, challengeId: string): Promise<void> {
    const challenge = this.challenges.find(c => c.id === challengeId);
    if (challenge && !challenge.participants.includes(userId)) {
      challenge.participants.push(userId);
      await this.saveToStorage();
    }
  }

  async getTrainingPlans(): Promise<TrainingPlan[]> {
    return this.trainingPlans;
  }

  async startTrainingPlan(userId: string, planId: string): Promise<TrainingPlan> {
    const plan = this.trainingPlans.find(p => p.id === planId);
    if (!plan) throw new Error('Training plan not found');
    
    // 사용자별 진도 저장
    await AsyncStorage.setItem(`training_${userId}_${planId}`, JSON.stringify({
      startDate: new Date(),
      progress: 0
    }));
    
    return plan;
  }

  async updateExerciseProgress(userId: string, planId: string, exerciseId: string): Promise<void> {
    const plan = this.trainingPlans.find(p => p.id === planId);
    if (!plan) return;
    
    const exercise = plan.exercises.find(e => e.id === exerciseId);
    if (exercise) {
      exercise.completed = true;
      
      // 전체 진도 계산
      const completedCount = plan.exercises.filter(e => e.completed).length;
      plan.progress = Math.round((completedCount / plan.exercises.length) * 100);
      
      await this.saveToStorage();
    }
  }

  async getFriends(userId: string): Promise<User[]> {
    const friendIds = this.friendships.get(userId) || [];
    return friendIds.map(id => this.users.get(id)).filter(Boolean) as User[];
  }

  async addFriend(userId: string, friendEmail: string): Promise<void> {
    const friend = Array.from(this.users.values()).find(u => u.email === friendEmail);
    if (!friend) {
      // Mock friend 생성
      const newFriend: User = {
        id: `friend_${Date.now()}`,
        name: friendEmail.split('@')[0],
        email: friendEmail,
        handicap: Math.floor(Math.random() * 20) + 5,
        averageScore: Math.floor(Math.random() * 20) + 75,
        swingCount: Math.floor(Math.random() * 100),
        joinDate: new Date()
      };
      this.users.set(newFriend.id, newFriend);
    }

    const friendships = this.friendships.get(userId) || [];
    if (friend && !friendships.includes(friend.id)) {
      friendships.push(friend.id);
      this.friendships.set(userId, friendships);
      
      // 양방향 친구 관계
      const reverseFriendships = this.friendships.get(friend.id) || [];
      reverseFriendships.push(userId);
      this.friendships.set(friend.id, reverseFriendships);
      
      await this.saveToStorage();
    }
  }

  async getLeaderboard(type: 'global' | 'friends' = 'global'): Promise<any[]> {
    let users = Array.from(this.users.values());
    
    if (type === 'friends') {
      // 친구 리더보드는 현재 사용자와 친구들만
      const currentUserId = await AsyncStorage.getItem('current_user_id');
      if (currentUserId) {
        const friendIds = this.friendships.get(currentUserId) || [];
        users = users.filter(u => u.id === currentUserId || friendIds.includes(u.id));
      }
    }

    return users
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 100)
      .map((user, index) => ({
        rank: index + 1,
        user,
        score: user.averageScore,
        improvement: Math.round(Math.random() * 10 - 5) // Mock improvement
      }));
  }

  async getStatistics(userId: string): Promise<any> {
    const history = await this.getSwingHistory(userId);
    const user = await this.getProfile(userId);
    
    // 최근 30일 데이터
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(s => s.date > thirtyDaysAgo);
    
    // 주간 데이터 계산
    const weeklyData = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekSwings = recentHistory.filter(s => s.date >= weekStart && s.date < weekEnd);
      
      weeklyData.unshift({
        week: `Week ${4 - i}`,
        average: weekSwings.length > 0 
          ? Math.round(weekSwings.reduce((sum, s) => sum + s.score, 0) / weekSwings.length)
          : 0,
        count: weekSwings.length
      });
    }

    return {
      totalSwings: user.swingCount,
      averageScore: user.averageScore,
      bestScore: history.length > 0 ? Math.max(...history.map(s => s.score)) : 0,
      worstScore: history.length > 0 ? Math.min(...history.map(s => s.score)) : 0,
      improvement: Math.round(Math.random() * 10 + 5), // Mock improvement percentage
      weeklyData,
      monthlyProgress: {
        posture: Math.round(Math.random() * 20 + 70),
        balance: Math.round(Math.random() * 20 + 65),
        power: Math.round(Math.random() * 20 + 60),
        consistency: Math.round(Math.random() * 20 + 55)
      },
      strongPoints: ['어드레스 자세', '백스윙 탑', '체중 이동'],
      weakPoints: ['임팩트 타이밍', '팔로우스루', '하체 회전']
    };
  }

  // 저장/로드 메서드
  private async saveToStorage(): Promise<void> {
    await AsyncStorage.setItem('mock_users', JSON.stringify(Array.from(this.users.entries())));
    await AsyncStorage.setItem('mock_swings', JSON.stringify(Array.from(this.swingHistory.entries())));
    await AsyncStorage.setItem('mock_challenges', JSON.stringify(this.challenges));
    await AsyncStorage.setItem('mock_training', JSON.stringify(this.trainingPlans));
    await AsyncStorage.setItem('mock_friends', JSON.stringify(Array.from(this.friendships.entries())));
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const users = await AsyncStorage.getItem('mock_users');
      if (users) this.users = new Map(JSON.parse(users));
      
      const swings = await AsyncStorage.getItem('mock_swings');
      if (swings) this.swingHistory = new Map(JSON.parse(swings));
      
      const challenges = await AsyncStorage.getItem('mock_challenges');
      if (challenges) this.challenges = JSON.parse(challenges);
      
      const training = await AsyncStorage.getItem('mock_training');
      if (training) this.trainingPlans = JSON.parse(training);
      
      const friends = await AsyncStorage.getItem('mock_friends');
      if (friends) this.friendships = new Map(JSON.parse(friends));
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  }

  // WebSocket 시뮬레이션
  simulateRealtimeUpdates(callback: (data: any) => void): () => void {
    const interval = setInterval(() => {
      // 랜덤 이벤트 생성
      const events = [
        { type: 'challenge_update', data: { challengeId: 'ch_1', newParticipant: 'User123' }},
        { type: 'friend_online', data: { userId: 'friend_1', status: 'online' }},
        { type: 'new_record', data: { userId: 'user_2', score: 92 }},
        { type: 'live_swing', data: { userId: 'friend_2', score: 85 }}
      ];
      
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      callback(randomEvent);
    }, 5000); // 5초마다 이벤트

    return () => clearInterval(interval);
  }
}

export default new MockBackendService();