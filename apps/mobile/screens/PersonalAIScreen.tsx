import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, fetchWithTimeout } from '../config/api';

const { width } = Dimensions.get('window');

interface PersonalAIData {
  model_accuracy: number;
  learning_progress: number;
  total_training_samples: number;
  last_training_date: string;
  improvement_areas: string[];
  strengths: string[];
  performance_trend: {
    dates: string[];
    scores: number[];
  };
  ai_recommendations: string[];
  federated_contribution: number;
}

const PersonalAIScreen: React.FC = () => {
  const { token, user } = useAuth();
  const [aiData, setAiData] = useState<PersonalAIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonalAIData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithTimeout(
        `${API_ENDPOINTS.personalAI}/insights`,
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
        setAiData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch AI data');
      }
    } catch (err) {
      console.error('Error fetching personal AI data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI insights');
      // No fallback data - show error state instead
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAIRetraining = async () => {
    try {
      Alert.alert('AI 모델 재학습', '개인 맞춤 AI 모델을 최신 데이터로 업데이트하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '재학습 시작',
          onPress: async () => {
            const response = await fetchWithTimeout(
              `${API_ENDPOINTS.personalAI}/retrain`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
                },
              },
              10000
            );

            if (response.ok) {
              Alert.alert(
                '성공',
                'AI 모델 재학습이 시작되었습니다. 완료까지 약 10-15분 소요됩니다.'
              );
              fetchPersonalAIData(); // Refresh data
            } else {
              Alert.alert('오류', 'AI 모델 재학습을 시작할 수 없습니다.');
            }
          },
        },
      ]);
    } catch (err) {
      Alert.alert('오류', 'AI 재학습 요청 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchPersonalAIData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>AI 인사이트를 불러오는 중...</Text>
      </View>
    );
  }

  if (error && !aiData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color="#ff6b35" />
        <Text style={styles.errorText}>AI 데이터를 불러올 수 없습니다</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPersonalAIData}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!aiData) return null;

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const progressData = {
    data: [
      aiData.model_accuracy / 100,
      aiData.learning_progress / 100,
      aiData.federated_contribution / 100,
    ],
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Ionicons name="bulb" size={40} color="white" />
        <Text style={styles.title}>개인 맞춤 AI</Text>
        <Text style={styles.subtitle}>당신만의 스윙 분석 AI</Text>
      </LinearGradient>

      {/* AI Performance Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{aiData.model_accuracy}%</Text>
          <Text style={styles.metricLabel}>AI 정확도</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{aiData.total_training_samples}</Text>
          <Text style={styles.metricLabel}>학습 샘플</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{aiData.learning_progress.toFixed(1)}%</Text>
          <Text style={styles.metricLabel}>학습 진도</Text>
        </View>
      </View>

      {/* Performance Trend Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>성능 트렌드</Text>
        <LineChart
          data={{
            labels: aiData.performance_trend.dates.map((date) =>
              new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
            ),
            datasets: [
              {
                data: aiData.performance_trend.scores,
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

      {/* Progress Circles */}
      <View style={styles.progressContainer}>
        <Text style={styles.sectionTitle}>AI 성능 지표</Text>
        <ProgressChart
          data={progressData}
          width={width - 40}
          height={220}
          strokeWidth={16}
          radius={32}
          chartConfig={chartConfig}
          hideLegend={false}
          style={styles.chart}
        />
        <View style={styles.progressLabels}>
          <View style={styles.progressLabel}>
            <View style={[styles.colorDot, { backgroundColor: '#667eea' }]} />
            <Text style={styles.progressText}>모델 정확도</Text>
          </View>
          <View style={styles.progressLabel}>
            <View style={[styles.colorDot, { backgroundColor: '#ff6b35' }]} />
            <Text style={styles.progressText}>학습 진도</Text>
          </View>
          <View style={styles.progressLabel}>
            <View style={[styles.colorDot, { backgroundColor: '#4ecdc4' }]} />
            <Text style={styles.progressText}>커뮤니티 기여</Text>
          </View>
        </View>
      </View>

      {/* Strengths and Improvements */}
      <View style={styles.analysisContainer}>
        <View style={styles.analysisCard}>
          <Text style={styles.analysisTitle}>🎯 강점</Text>
          {aiData.strengths.map((strength, index) => (
            <View key={index} style={styles.analysisItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.analysisText}>{strength}</Text>
            </View>
          ))}
        </View>

        <View style={styles.analysisCard}>
          <Text style={styles.analysisTitle}>🔧 개선 영역</Text>
          {aiData.improvement_areas.map((area, index) => (
            <View key={index} style={styles.analysisItem}>
              <Ionicons name="arrow-up-circle" size={16} color="#ff6b35" />
              <Text style={styles.analysisText}>{area}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* AI Recommendations */}
      <View style={styles.recommendationsContainer}>
        <Text style={styles.sectionTitle}>🤖 AI 추천사항</Text>
        {aiData.ai_recommendations.map((recommendation, index) => (
          <View key={index} style={styles.recommendationCard}>
            <Ionicons name="bulb" size={20} color="#FFC107" />
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        ))}
      </View>

      {/* Retrain Button */}
      <TouchableOpacity style={styles.retrainButton} onPress={triggerAIRetraining}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.retrainGradient}>
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.retrainText}>AI 모델 재학습</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Last Update Info */}
      <View style={styles.updateInfo}>
        <Text style={styles.updateText}>
          최근 학습: {new Date(aiData.last_training_date).toLocaleString('ko-KR')}
        </Text>
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
  metricsContainer: {
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
  metricCard: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
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
  progressContainer: {
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
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
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
  analysisContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  analysisCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  analysisItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  recommendationsContainer: {
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
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  retrainButton: {
    margin: 20,
    marginBottom: 10,
  },
  retrainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
  },
  retrainText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  updateInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  updateText: {
    fontSize: 12,
    color: '#999',
  },
});

export default PersonalAIScreen;
