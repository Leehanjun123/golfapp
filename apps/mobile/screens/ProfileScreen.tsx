import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../config/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedButton } from '../components/AnimatedButton';
import { LoadingAnimation } from '../components/LoadingAnimation';

// TypeScript interfaces
interface UserProfile {
  id: string;
  name: string;
  level: number;
  title: string;
  profileImage?: string;
  memberSince: string;
}

interface UserStats {
  averageScore: number;
  driveDistance: number;
  handicap: number;
  totalRounds: number;
  bestScore?: number;
  improvementRate?: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockedDate: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ProfileData {
  profile: UserProfile;
  stats: UserStats;
  achievements: Achievement[];
  recentActivity: any[];
}

const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { token, user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fetch user profile data from API
  const fetchProfileData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      console.log('Profile fetch - Token:', token);
      console.log('Profile fetch - URL:', API_ENDPOINTS.profile);
      
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      if (token && token !== 'guest') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(API_ENDPOINTS.profile, {
        method: 'GET',
        headers,
      });
      
      console.log('Profile response status:', response.status);
      const result: ApiResponse<ProfileData> = await response.json();
      console.log('Profile response data:', result);
      console.log('Profile data structure:', {
        hasProfile: !!result.data?.profile,
        hasStats: !!result.data?.stats,
        hasAchievements: !!result.data?.achievements,
        achievementsLength: result.data?.achievements?.length
      });

      if (result.success && result.data) {
        setProfileData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch profile data');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      // No fallback data - show error state instead
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchProfileData(true);
  };

  const handleEditProfile = () => {
    // @ts-ignore
    navigation.navigate('ProfileEdit', { profileData });
  };

  const handleSettings = () => {
    // @ts-ignore
    navigation.navigate('Settings');
  };

  const handleSubscriptionManagement = () => {
    Alert.alert('구독 관리', '구독을 변경하거나 관리하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '프리미엄 업그레이드',
        onPress: () => {
          Alert.alert(
            '프리미엄 구독',
            '• 무제한 AI 스윙 분석\n• 고급 훈련 계획\n• 프로 골퍼 비교\n• 우선 고객 지원\n\n월 $9.99',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '구독하기',
                onPress: () => Alert.alert('성공', '프리미엄 구독이 활성화되었습니다!'),
              },
            ]
          );
        },
      },
      {
        text: '구독 관리',
        onPress: () => {
          Alert.alert('구독 현황', '현재 구독: 무료\n다음 결제일: 해당 없음');
        },
      },
    ]);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return '#8E8E93';
      case 'rare':
        return '#007AFF';
      case 'epic':
        return '#AF52DE';
      case 'legendary':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>프로필을 불러오는 중...</Text>
      </View>
    );
  }

  if (error && !profileData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color="#ff6b35" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchProfileData()}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={['#667eea']}
          tintColor="#667eea"
        />
      }
    >
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Ionicons name="person-circle" size={100} color="white" />
          <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
            <Ionicons name="pencil" size={16} color="#667eea" />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>
          {profileData?.profile?.name || profileData?.profile?.username || ''}
        </Text>
        {profileData?.profile?.level ? (
          <Text style={styles.level}>
            {`레벨 ${profileData.profile.level}`}
          </Text>
        ) : profileData?.profile?.handicap !== undefined ? (
          <Text style={styles.level}>
            {`핸디캡 ${profileData.profile.handicap}`}
          </Text>
        ) : null}
        {profileData?.profile?.created_at ? (
          <Text style={styles.memberSince}>
            {`가입일: ${new Date(profileData.profile.created_at).toLocaleDateString('ko-KR')}`}
          </Text>
        ) : null}
      </LinearGradient>

      <View style={styles.statsGrid}>
        {profileData?.stats?.averageScore !== undefined ? (
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Math.round(profileData.stats.averageScore)}
            </Text>
            <Text style={styles.statLabel}>평균 스코어</Text>
            {profileData?.stats?.bestScore ? (
              <Text style={styles.bestScore}>
                {`최고: ${profileData.stats.bestScore}`}
              </Text>
            ) : null}
          </View>
        ) : null}
        
        {profileData?.profile?.drive_distance ? (
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {`${profileData.profile.drive_distance}yd`}
            </Text>
            <Text style={styles.statLabel}>드라이브</Text>
          </View>
        ) : null}
        
        {profileData?.profile?.handicap !== undefined ? (
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {profileData.profile.handicap}
            </Text>
            <Text style={styles.statLabel}>핸디캡</Text>
            {profileData?.stats?.improvement ? (
              <Text style={styles.improvement}>
                {`↑ ${profileData.stats.improvement}%`}
              </Text>
            ) : null}
          </View>
        ) : null}
        
        {profileData?.profile?.total_rounds !== undefined ? (
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {profileData.profile.total_rounds}
            </Text>
            <Text style={styles.statLabel}>라운드</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{`🏆 업적 (${profileData?.achievements?.length || 0}개)`}</Text>
        {profileData?.achievements?.map((achievement) => (
          <View key={achievement.id} style={styles.achievementCard}>
            <View
              style={[
                styles.achievementIcon,
                { backgroundColor: getRarityColor(achievement.rarity || 'common') },
              ]}
            >
              <Ionicons name={achievement.icon as any} size={24} color="white" />
            </View>
            <View style={styles.achievementContent}>
              <View style={styles.achievementHeader}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                {achievement.rarity && (
                  <Text style={[styles.rarityBadge, { color: getRarityColor(achievement.rarity) }]}>
                    {achievement.rarity.toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={styles.achievementDesc}>{achievement.description}</Text>
              {achievement.unlockedDate && (
                <Text style={styles.achievementDate}>
                  달성일: {new Date(achievement.unlockedDate).toLocaleDateString('ko-KR')}
                </Text>
              )}
            </View>
          </View>
        )) || (
          <View style={styles.emptyAchievements}>
            <Ionicons name="trophy-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>아직 획득한 업적이 없습니다</Text>
          </View>
        )}
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>빠른 접근</Text>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('PersonalAI')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="bulb" size={24} color="#667eea" />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>개인 맞춤 AI</Text>
            <Text style={styles.quickActionDesc}>AI 학습 진도 및 인사이트</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('Stats')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="stats-chart" size={24} color="#4ecdc4" />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>상세 통계</Text>
            <Text style={styles.quickActionDesc}>성능 분석 및 트렌드</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('TrainingPlan')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="fitness" size={24} color="#ff6b35" />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>AI 훈련 계획</Text>
            <Text style={styles.quickActionDesc}>맞춤형 연습 프로그램</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="podium" size={24} color="#FFD700" />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>리더보드</Text>
            <Text style={styles.quickActionDesc}>친구들과 순위 경쟁</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
          <Ionicons name="person" size={20} color="#667eea" />
          <Text style={styles.actionText}>프로필 편집</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleSettings}>
          <Ionicons name="settings" size={20} color="#667eea" />
          <Text style={styles.actionText}>설정</Text>
        </TouchableOpacity>
      </View>

      {/* Subscription Management */}
      <View style={styles.subscriptionContainer}>
        <Text style={styles.sectionTitle}>구독 관리</Text>
        <TouchableOpacity style={styles.subscriptionCard} onPress={handleSubscriptionManagement}>
          <View style={styles.subscriptionIcon}>
            <Ionicons name="diamond" size={24} color="#FFD700" />
          </View>
          <View style={styles.subscriptionContent}>
            <Text style={styles.subscriptionTitle}>프리미엄 구독</Text>
            <Text style={styles.subscriptionDesc}>무제한 AI 분석 및 고급 기능</Text>
          </View>
          <View style={styles.subscriptionAction}>
            <Text style={styles.subscriptionStatus}>무료</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Dark Mode Toggle Section */}
      <View style={styles.darkModeSection}>
        <View style={styles.darkModeHeader}>
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={24}
            color={isDark ? '#FFD700' : '#FFA500'}
          />
          <Text style={styles.darkModeText}>다크 모드</Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#767577', true: '#667eea' }}
          thumbColor={isDark ? '#764ba2' : '#f4f3f4'}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileImageContainer: {
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  level: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    marginTop: -20,
  },
  statCard: {
    width: '45%',
    backgroundColor: 'white',
    padding: 20,
    margin: '2.5%',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementContent: {
    marginLeft: 15,
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  achievementDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  memberSince: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bestScore: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '600',
  },
  improvement: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '600',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rarityBadge: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  darkModeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    marginTop: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  darkModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkModeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: '#333',
  },
  achievementDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  emptyAchievements: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    margin: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#667eea',
    borderRadius: 24,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsContainer: {
    padding: 20,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quickActionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  subscriptionContainer: {
    padding: 20,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subscriptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fffbf0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  subscriptionContent: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subscriptionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  subscriptionAction: {
    alignItems: 'center',
  },
  subscriptionStatus: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});

export default ProfileScreen;
