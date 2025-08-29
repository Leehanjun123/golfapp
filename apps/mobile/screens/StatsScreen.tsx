import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, fetchWithTimeout } from '../config/api';

const { width } = Dimensions.get('window');

interface UserStatistics {
  user_info: {
    username: string;
    handicap: number;
    subscription_tier: string;
    total_swings_analyzed: number;
    avg_score: number;
  };
  stats: {
    total_swings: number;
    avg_score: number;
    handicap: number;
    subscription: string;
  };
  recent_analyses: Array<{
    id: string;
    phase: string;
    similarity_score: number;
    confidence: number;
    created_at: string;
  }>;
  active_challenges: Array<{
    id: string;
    title: string;
    progress: number;
    target_value: number;
  }>;
  achievements: Array<{
    badge: string;
    earned: string;
  }>;
  performance_history: {
    dates: string[];
    scores: number[];
    accuracy: number[];
  };
  phase_breakdown: {
    address: number;
    backswing: number;
    impact: number;
    follow_through: number;
  };
}

const StatsScreen: React.FC = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  const fetchUserStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithTimeout(
        `${API_ENDPOINTS.stats}/detailed`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        5000
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching user statistics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
      // No fallback data - show error state instead
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStatistics();
  }, [selectedPeriod]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>통계를 불러오는 중...</Text>
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color="#ff6b35" />
        <Text style={styles.errorText}>통계를 불러올 수 없습니다</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserStatistics}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) return null;

  // Chart configurations
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  // Phase breakdown pie chart data
  const phaseData = [
    {
      name: '어드레스',
      population: stats.phase_breakdown.address,
      color: '#667eea',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: '백스윙',
      population: stats.phase_breakdown.backswing,
      color: '#ff6b35',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: '임팩트',
      population: stats.phase_breakdown.impact,
      color: '#4ecdc4',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: '팔로우스루',
      population: stats.phase_breakdown.follow_through,
      color: '#ff6b9d',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Ionicons name="stats-chart" size={40} color="white" />
        <Text style={styles.title}>상세 통계</Text>
        <Text style={styles.subtitle}>{stats.user_info.username}</Text>
      </LinearGradient>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'year'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.periodButton, selectedPeriod === period && styles.selectedPeriodButton]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.selectedPeriodButtonText,
              ]}
            >
              {period === 'week' ? '주간' : period === 'month' ? '월간' : '연간'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.stats.total_swings}</Text>
          <Text style={styles.statLabel}>총 분석 횟수</Text>
          <Ionicons name="golf" size={20} color="#667eea" />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.stats.avg_score.toFixed(1)}</Text>
          <Text style={styles.statLabel}>평균 점수</Text>
          <Ionicons name="trending-up" size={20} color="#4CAF50" />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.stats.handicap}</Text>
          <Text style={styles.statLabel}>핸디캡</Text>
          <Ionicons name="ribbon" size={20} color="#FF9800" />
        </View>
      </View>

      {/* Performance Trend */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>성능 트렌드</Text>
        <LineChart
          data={{
            labels: stats.performance_history.dates.map((date) =>
              new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
            ),
            datasets: [
              {
                data: stats.performance_history.scores,
                strokeWidth: 2,
              },
            ],
          }}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      </View>

      {/* Accuracy Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>정확도 변화</Text>
        <BarChart
          data={{
            labels: ['월', '화', '수', '목', '금'],
            datasets: [
              {
                data: stats.performance_history.accuracy,
              },
            ],
          }}
          width={width - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix="%"
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
        />
      </View>

      {/* Phase Breakdown */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>스윙 단계별 분석 비율</Text>
        <PieChart
          data={phaseData}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>

      {/* Recent Analyses */}
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>최근 분석 결과</Text>
        {stats.recent_analyses.map((analysis) => (
          <View key={analysis.id} style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <Text style={styles.analysisPhase}>{analysis.phase}</Text>
              <Text style={styles.analysisDate}>
                {new Date(analysis.created_at).toLocaleDateString('ko-KR')}
              </Text>
            </View>
            <View style={styles.analysisMetrics}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>유사도</Text>
                <Text style={styles.metricValue}>{analysis.similarity_score}%</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>신뢰도</Text>
                <Text style={styles.metricValue}>{analysis.confidence}%</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Active Challenges */}
      <View style={styles.challengesContainer}>
        <Text style={styles.sectionTitle}>진행 중인 챌린지</Text>
        {stats.active_challenges.map((challenge) => (
          <View key={challenge.id} style={styles.challengeCard}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${challenge.progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{challenge.progress}%</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Achievements */}
      <View style={styles.achievementsContainer}>
        <Text style={styles.sectionTitle}>획득한 업적</Text>
        <View style={styles.achievementsList}>
          {stats.achievements.map((achievement, index) => (
            <View key={index} style={styles.achievementBadge}>
              <Ionicons name="medal" size={24} color="#FFD700" />
              <Text style={styles.achievementText}>{achievement.badge}</Text>
            </View>
          ))}
        </View>
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
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#667eea',
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    marginHorizontal: 2,
    borderRadius: 25,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: '#667eea',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedPeriodButtonText: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginHorizontal: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    marginBottom: 8,
  },
  chartContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  chart: {
    borderRadius: 16,
  },
  recentContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  analysisCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  analysisPhase: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  analysisDate: {
    fontSize: 12,
    color: '#666',
  },
  analysisMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  challengesContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  challengeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  achievementsContainer: {
    margin: 20,
    marginBottom: 30,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  achievementBadge: {
    alignItems: 'center',
    margin: 10,
  },
  achievementText: {
    fontSize: 12,
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default StatsScreen;
