import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, fetchWithTimeout } from '../config/api';

interface Exercise {
  name: string;
  description: string;
  duration_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focus_areas: string[];
  instructions: string[];
}

interface TrainingPlan {
  id: string;
  title: string;
  description: string;
  duration_weeks: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  exercises: Exercise[];
  schedule: {
    [day: string]: string[]; // day of week -> exercise names
  };
  progress: {
    completed_exercises: number;
    total_exercises: number;
    current_week: number;
  };
  ai_recommendations: string[];
}

interface CustomPlanRequest {
  current_handicap: number;
  goals: string[];
  available_time_minutes: number;
  preferred_focus: string[];
}

const TrainingPlanScreen: React.FC = () => {
  const { token, user } = useAuth();
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomPlanModal, setShowCustomPlanModal] = useState(false);
  const [customPlanRequest, setCustomPlanRequest] = useState<CustomPlanRequest>({
    current_handicap: 20,
    goals: [],
    available_time_minutes: 60,
    preferred_focus: [],
  });

  const fetchTrainingPlans = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithTimeout(
        `${API_ENDPOINTS.trainingPlans}`,
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
        setTrainingPlans(result.data);
        if (result.data.length > 0) {
          setSelectedPlan(result.data[0]);
        }
      } else {
        throw new Error(result.error || 'Failed to fetch training plans');
      }
    } catch (err) {
      console.error('Error fetching training plans:', err);
      setError(err instanceof Error ? err.message : 'Failed to load training plans');
      // No fallback data - show error state instead
    } finally {
      setIsLoading(false);
    }
  };

  const generateCustomPlan = async () => {
    try {
      setIsGenerating(true);

      const response = await fetchWithTimeout(
        `${API_ENDPOINTS.trainingPlans}/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(customPlanRequest),
        },
        10000
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setTrainingPlans([result.data, ...trainingPlans]);
        setSelectedPlan(result.data);
        setShowCustomPlanModal(false);
        Alert.alert('성공', 'AI가 당신만의 맞춤 훈련 계획을 생성했습니다!');
      } else {
        throw new Error(result.error || 'Failed to generate custom plan');
      }
    } catch (err) {
      console.error('Error generating custom plan:', err);
      Alert.alert('오류', 'AI 훈련 계획 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const markExerciseComplete = async (exerciseName: string) => {
    try {
      const response = await fetchWithTimeout(
        `${API_ENDPOINTS.trainingPlans}/${selectedPlan?.id}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ exercise_name: exerciseName }),
        },
        5000
      );

      if (response.ok) {
        Alert.alert('완료', `${exerciseName} 연습을 완료했습니다!`);
        fetchTrainingPlans(); // Refresh data
      } else {
        Alert.alert('오류', '연습 완료 처리에 실패했습니다.');
      }
    } catch (err) {
      Alert.alert('오류', '연습 완료 처리 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchTrainingPlans();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>훈련 계획을 불러오는 중...</Text>
      </View>
    );
  }

  if (error && trainingPlans.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color="#ff6b35" />
        <Text style={styles.errorText}>훈련 계획을 불러올 수 없습니다</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTrainingPlans}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Ionicons name="fitness" size={40} color="white" />
        <Text style={styles.title}>AI 훈련 계획</Text>
        <Text style={styles.subtitle}>개인 맞춤 연습 프로그램</Text>
      </LinearGradient>

      {/* Plan Selector */}
      <View style={styles.planSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {trainingPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planTab, selectedPlan?.id === plan.id && styles.selectedPlanTab]}
              onPress={() => setSelectedPlan(plan)}
            >
              <Text
                style={[
                  styles.planTabText,
                  selectedPlan?.id === plan.id && styles.selectedPlanTabText,
                ]}
              >
                {plan.title}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.customPlanButton}
            onPress={() => setShowCustomPlanModal(true)}
          >
            <Ionicons name="add" size={20} color="#667eea" />
            <Text style={styles.customPlanText}>맞춤 계획</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {selectedPlan && (
        <>
          {/* Plan Overview */}
          <View style={styles.planOverview}>
            <Text style={styles.planTitle}>{selectedPlan.title}</Text>
            <Text style={styles.planDescription}>{selectedPlan.description}</Text>

            <View style={styles.planStats}>
              <View style={styles.planStat}>
                <Text style={styles.planStatValue}>{selectedPlan.duration_weeks}</Text>
                <Text style={styles.planStatLabel}>주</Text>
              </View>
              <View style={styles.planStat}>
                <Text style={styles.planStatValue}>{selectedPlan.exercises.length}</Text>
                <Text style={styles.planStatLabel}>연습</Text>
              </View>
              <View style={styles.planStat}>
                <Text style={styles.planStatValue}>{selectedPlan.level}</Text>
                <Text style={styles.planStatLabel}>레벨</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>진행 상황</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(selectedPlan.progress.completed_exercises / selectedPlan.progress.total_exercises) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {selectedPlan.progress.completed_exercises}/{selectedPlan.progress.total_exercises}{' '}
                완료 (주 {selectedPlan.progress.current_week}/{selectedPlan.duration_weeks})
              </Text>
            </View>
          </View>

          {/* Weekly Schedule */}
          <View style={styles.scheduleContainer}>
            <Text style={styles.sectionTitle}>주간 일정</Text>
            {Object.entries(selectedPlan.schedule).map(([day, exercises]) => (
              <View key={day} style={styles.daySchedule}>
                <Text style={styles.dayLabel}>{day}요일</Text>
                <View style={styles.dayExercises}>
                  {exercises.map((exerciseName, index) => (
                    <View key={index} style={styles.exerciseChip}>
                      <Text style={styles.exerciseChipText}>{exerciseName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Exercises */}
          <View style={styles.exercisesContainer}>
            <Text style={styles.sectionTitle}>연습 종목</Text>
            {selectedPlan.exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseMeta}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.exerciseDuration}>{exercise.duration_minutes}분</Text>
                    <Text
                      style={[
                        styles.exerciseDifficulty,
                        { color: getDifficultyColor(exercise.difficulty) },
                      ]}
                    >
                      {exercise.difficulty}
                    </Text>
                  </View>
                </View>

                <Text style={styles.exerciseDescription}>{exercise.description}</Text>

                <View style={styles.focusAreas}>
                  {exercise.focus_areas.map((area, areaIndex) => (
                    <View key={areaIndex} style={styles.focusArea}>
                      <Text style={styles.focusAreaText}>{area}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.instructions}>
                  <Text style={styles.instructionsTitle}>실행 방법:</Text>
                  {exercise.instructions.map((instruction, instIndex) => (
                    <Text key={instIndex} style={styles.instruction}>
                      {instIndex + 1}. {instruction}
                    </Text>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => markExerciseComplete(exercise.name)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.completeButtonText}>완료 표시</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* AI Recommendations */}
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>AI 추천사항</Text>
            {selectedPlan.ai_recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationCard}>
                <Ionicons name="bulb" size={20} color="#FFC107" />
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Custom Plan Modal */}
      <Modal visible={showCustomPlanModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>맞춤 훈련 계획 생성</Text>
            <TouchableOpacity onPress={() => setShowCustomPlanModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>현재 핸디캡</Text>
            <View style={styles.handicapSelector}>
              {[10, 15, 20, 25, 30].map((handicap) => (
                <TouchableOpacity
                  key={handicap}
                  style={[
                    styles.handicapOption,
                    customPlanRequest.current_handicap === handicap && styles.selectedOption,
                  ]}
                  onPress={() =>
                    setCustomPlanRequest({ ...customPlanRequest, current_handicap: handicap })
                  }
                >
                  <Text style={styles.handicapOptionText}>{handicap}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionTitle}>목표</Text>
            <View style={styles.goalsSelector}>
              {['정확도 향상', '거리 증가', '스코어 개선', '일관성 향상'].map((goal) => (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.goalOption,
                    customPlanRequest.goals.includes(goal) && styles.selectedOption,
                  ]}
                  onPress={() => {
                    const goals = customPlanRequest.goals.includes(goal)
                      ? customPlanRequest.goals.filter((g) => g !== goal)
                      : [...customPlanRequest.goals, goal];
                    setCustomPlanRequest({ ...customPlanRequest, goals });
                  }}
                >
                  <Text style={styles.goalOptionText}>{goal}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateCustomPlan}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="white" />
                  <Text style={styles.generateButtonText}>AI 계획 생성</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner':
      return '#4CAF50';
    case 'intermediate':
      return '#FF9800';
    case 'advanced':
      return '#F44336';
    default:
      return '#666';
  }
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
  planSelector: {
    marginTop: 20,
    paddingLeft: 20,
  },
  planTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 25,
    marginRight: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  selectedPlanTab: {
    backgroundColor: '#667eea',
  },
  planTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedPlanTabText: {
    color: 'white',
  },
  customPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 25,
    marginRight: 20,
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
  },
  customPlanText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    marginLeft: 5,
  },
  planOverview: {
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
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  planStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  planStat: {
    alignItems: 'center',
  },
  planStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  planStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressSection: {
    marginTop: 15,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  scheduleContainer: {
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
  daySchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 60,
  },
  dayExercises: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  exerciseChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  exerciseChipText: {
    fontSize: 12,
    color: '#666',
  },
  exercisesContainer: {
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
  exerciseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseDuration: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 8,
  },
  exerciseDifficulty: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  focusAreas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  focusArea: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  focusAreaText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  instructions: {
    marginBottom: 15,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  recommendationsContainer: {
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
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9c4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  handicapSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  handicapOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    minWidth: 50,
    alignItems: 'center',
  },
  handicapOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedOption: {
    backgroundColor: '#667eea',
  },
  goalsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  goalOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    margin: 4,
  },
  goalOptionText: {
    fontSize: 14,
    color: '#666',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    borderRadius: 25,
    paddingVertical: 15,
    marginTop: 20,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TrainingPlanScreen;
