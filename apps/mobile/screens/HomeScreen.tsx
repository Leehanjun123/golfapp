import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useDataService } from '../hooks/useDataService';
import { API_ENDPOINTS, fetchWithTimeout } from '../config/api';

// TypeScript interfaces
interface UserStats {
  averageScore: number;
  driveDistance: number;
  handicap: number;
  totalRounds: number;
}

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
  route: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const features: Feature[] = [
    {
      icon: 'trophy',
      title: '프로 골퍼 비교',
      description: 'Tiger Woods, Rory McIlroy, Jon Rahm과 스윙 비교',
      color: '#ff6b35',
      route: 'SwingComparison',
    },
    {
      icon: 'chatbubbles',
      title: 'AI 코치',
      description: '24/7 개인 맞춤 레슨 및 성격별 코치 선택',
      color: '#667eea',
      route: 'AICoach',
    },
    {
      icon: 'people',
      title: '소셜 챌린지',
      description: '친구들과 골프 실력 경쟁 및 리더보드',
      color: '#4ecdc4',
      route: 'Challenges',
    },
    {
      icon: 'flag',
      title: '목표 설정',
      description: '개인 맞춤 골프 목표 설정 및 달성',
      color: '#ff6b9d',
      route: 'GoalSetting',
    },
  ];

  // Fetch user stats from API
  const fetchUserStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching from URL:', API_ENDPOINTS.stats);
      console.log('Token:', token);

      const response = await fetchWithTimeout(
        API_ENDPOINTS.stats,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        3000
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<UserStats> = await response.json();

      if (result.success && result.data) {
        setUserStats(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch user stats');
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user statistics');
      // No fallback data - show error state instead
    } finally {
      setIsLoading(false);
    }
  };

  const startSwingAnalysis = async () => {
    try {
      Alert.alert('스윙 분석 선택', '어떤 방식으로 스윙 분석을 진행하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '사진 분석',
          onPress: () => navigation.navigate('SwingAnalysis'),
        },
        {
          text: '비디오 분석',
          onPress: () => navigation.navigate('VideoAnalysis'),
        },
      ]);
    } catch (err) {
      Alert.alert('오류', '스윙 분석을 시작할 수 없습니다.');
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>⛳</Text>
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Golf AI Coach</Text>
        <Text style={styles.subtitle}>당신만의 프로 골프 트레이너</Text>
      </LinearGradient>

      <View style={styles.statsContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>통계를 불러오는 중...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color="#ff6b35" />
            <Text style={styles.errorText}>통계 로딩 실패</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUserStats}>
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : userStats ? (
          <>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userStats.averageScore}</Text>
              <Text style={styles.statLabel}>평균 스코어</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userStats.driveDistance}</Text>
              <Text style={styles.statLabel}>드라이브 거리</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userStats.handicap}</Text>
              <Text style={styles.statLabel}>핸디캡</Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>주요 기능</Text>
        {features.map((feature, index) => (
          <TouchableOpacity
            key={index}
            style={styles.featureCard}
            onPress={() => {
              // Navigate to the appropriate screen
              if (feature.route === 'SwingComparison') {
                navigation.navigate('SwingComparison');
              } else if (feature.route === 'AICoach') {
                navigation.navigate('AI Coach');
              } else if (feature.route === 'Challenges') {
                navigation.navigate('Challenges');
              } else if (feature.route === 'GoalSetting') {
                navigation.navigate('GoalSetting');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: feature.color }]}>
              <Ionicons name={feature.icon as any} size={24} color="white" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startSwingAnalysis} activeOpacity={0.8}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradientButton}>
          <Ionicons name="camera" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.startButtonText}>AI 스윙 분석 시작</Text>
        </LinearGradient>
      </TouchableOpacity>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  searchButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logo: {
    fontSize: 60,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: -30,
    marginHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  featuresContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  featureCard: {
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  startButton: {
    margin: 20,
    marginBottom: 40,
  },
  gradientButton: {
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#667eea',
    borderRadius: 16,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HomeScreen;
