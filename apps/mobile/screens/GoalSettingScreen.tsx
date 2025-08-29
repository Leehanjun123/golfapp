import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineAwareAPI } from '../contexts/OfflineContext';
import { API_ENDPOINTS } from '../config/api';
import { AnimatedButton } from '../components/AnimatedButton';

interface Goal {
  id: string;
  title: string;
  description: string;
  type: 'score' | 'distance' | 'accuracy' | 'handicap' | 'frequency' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  status: 'active' | 'completed' | 'paused' | 'expired';
  createdAt: string;
  progress: number;
  milestones: GoalMilestone[];
}

interface GoalMilestone {
  id: string;
  title: string;
  value: number;
  achieved: boolean;
  achievedDate?: string;
}

interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  type: Goal['type'];
  defaultTarget: number;
  unit: string;
  icon: string;
  color: string;
  duration: number; // days
}

const GoalSettingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { makeRequest, isConnected } = useOfflineAwareAPI();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    type: 'score' as Goal['type'],
    targetValue: 0,
    unit: '',
    deadline: '',
  });

  const goalTemplates: GoalTemplate[] = [
    {
      id: 'lower_handicap',
      title: '핸디캡 줄이기',
      description: '현재 핸디캡보다 낮은 핸디캡 달성',
      type: 'handicap',
      defaultTarget: -3,
      unit: '점',
      icon: 'trending-down',
      color: '#4CAF50',
      duration: 90,
    },
    {
      id: 'improve_score',
      title: '평균 스코어 개선',
      description: '18홀 평균 스코어 향상',
      type: 'score',
      defaultTarget: 85,
      unit: '타',
      icon: 'golf',
      color: '#2196F3',
      duration: 60,
    },
    {
      id: 'drive_distance',
      title: '드라이브 거리 늘리기',
      description: '평균 드라이브 비거리 증가',
      type: 'distance',
      defaultTarget: 250,
      unit: 'yards',
      icon: 'arrow-forward',
      color: '#FF9800',
      duration: 120,
    },
    {
      id: 'play_frequency',
      title: '라운드 횟수 늘리기',
      description: '월간 라운드 횟수 증가',
      type: 'frequency',
      defaultTarget: 8,
      unit: '회/월',
      icon: 'calendar',
      color: '#9C27B0',
      duration: 30,
    },
    {
      id: 'accuracy_rate',
      title: '페어웨이 적중률 향상',
      description: '드라이버 정확도 개선',
      type: 'accuracy',
      defaultTarget: 75,
      unit: '%',
      icon: 'target',
      color: '#E91E63',
      duration: 90,
    },
  ];

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);

      const response = await makeRequest(
        `${API_ENDPOINTS.goals}`,
        {
          headers: token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {},
        },
        'user_goals'
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setGoals(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!newGoal.title || !newGoal.targetValue) {
      Alert.alert('오류', '목표 제목과 목표값을 입력해주세요.');
      return;
    }

    try {
      const response = await makeRequest(`${API_ENDPOINTS.goals}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newGoal),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Alert.alert('성공', '새로운 목표가 생성되었습니다!');
          setShowCreateModal(false);
          resetNewGoal();
          loadGoals();
        }
      }
    } catch (error) {
      Alert.alert('오류', '목표 생성에 실패했습니다.');
    }
  };

  const updateGoalProgress = async (goalId: string, progress: number) => {
    try {
      const response = await makeRequest(`${API_ENDPOINTS.goals}/${goalId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ progress }),
      });

      if (response.ok) {
        loadGoals();
      }
    } catch (error) {
      console.error('Failed to update goal progress:', error);
    }
  };

  const deleteGoal = async (goalId: string) => {
    Alert.alert('목표 삭제', '정말로 이 목표를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await makeRequest(`${API_ENDPOINTS.goals}/${goalId}`, {
              method: 'DELETE',
              headers: token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {},
            });

            if (response.ok) {
              loadGoals();
              Alert.alert('완료', '목표가 삭제되었습니다.');
            }
          } catch (error) {
            Alert.alert('오류', '목표 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const selectTemplate = (template: GoalTemplate) => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + template.duration);

    setNewGoal({
      title: template.title,
      description: template.description,
      type: template.type,
      targetValue: template.defaultTarget,
      unit: template.unit,
      deadline: deadline.toISOString().split('T')[0],
    });
    setShowTemplates(false);
  };

  const resetNewGoal = () => {
    setNewGoal({
      title: '',
      description: '',
      type: 'score',
      targetValue: 0,
      unit: '',
      deadline: '',
    });
  };

  const getGoalStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'active':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.success;
      case 'paused':
        return theme.colors.warning;
      case 'expired':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getGoalStatusText = (status: Goal['status']) => {
    switch (status) {
      case 'active':
        return '진행 중';
      case 'completed':
        return '완료';
      case 'paused':
        return '일시정지';
      case 'expired':
        return '기간 만료';
      default:
        return '알 수 없음';
    }
  };

  const renderGoalCard = (goal: Goal) => (
    <TouchableOpacity
      key={goal.id}
      style={[styles.goalCard, { backgroundColor: theme.colors.card }]}
      onPress={() => setSelectedGoal(goal)}
    >
      <View style={styles.goalHeader}>
        <View style={styles.goalInfo}>
          <Text style={[styles.goalTitle, { color: theme.colors.text }]}>{goal.title}</Text>
          <Text style={[styles.goalDescription, { color: theme.colors.textSecondary }]}>
            {goal.description}
          </Text>
        </View>

        <View style={styles.goalActions}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getGoalStatusColor(goal.status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getGoalStatusColor(goal.status) }]}>
              {getGoalStatusText(goal.status)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: theme.colors.text }]}>
            {goal.currentValue} / {goal.targetValue} {goal.unit}
          </Text>
          <Text style={[styles.progressPercentage, { color: theme.colors.primary }]}>
            {Math.round(goal.progress)}%
          </Text>
        </View>

        <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(goal.progress, 100)}%`,
                backgroundColor:
                  goal.status === 'completed' ? theme.colors.success : theme.colors.primary,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.goalFooter}>
        <Text style={[styles.deadlineText, { color: theme.colors.textSecondary }]}>
          마감: {new Date(goal.deadline).toLocaleDateString('ko-KR')}
        </Text>

        {goal.milestones && goal.milestones.length > 0 && (
          <View style={styles.milestonesContainer}>
            {goal.milestones.map((milestone, index) => (
              <View
                key={milestone.id}
                style={[
                  styles.milestone,
                  {
                    backgroundColor: milestone.achieved
                      ? theme.colors.success + '20'
                      : theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={milestone.achieved ? 'checkmark-circle' : 'radio-button-off'}
                  size={12}
                  color={milestone.achieved ? theme.colors.success : theme.colors.textSecondary}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderTemplateCard = (template: GoalTemplate) => (
    <TouchableOpacity
      key={template.id}
      style={[styles.templateCard, { backgroundColor: theme.colors.card }]}
      onPress={() => selectTemplate(template)}
    >
      <View style={[styles.templateIcon, { backgroundColor: template.color }]}>
        <Ionicons name={template.icon as any} size={24} color="white" />
      </View>

      <View style={styles.templateInfo}>
        <Text style={[styles.templateTitle, { color: theme.colors.text }]}>{template.title}</Text>
        <Text style={[styles.templateDescription, { color: theme.colors.textSecondary }]}>
          {template.description}
        </Text>
        <Text style={[styles.templateDuration, { color: theme.colors.primary }]}>
          {template.duration}일 목표
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          목표를 불러오는 중...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient colors={['#FF6B6B', '#FF8E53']} style={styles.header}>
        <Text style={styles.headerTitle}>목표 설정</Text>
        <Text style={styles.headerSubtitle}>골프 실력 향상을 위한 개인 목표를 설정하세요</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {goals.filter((g) => g.status === 'active').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>진행 중</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {goals.filter((g) => g.status === 'completed').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>완료</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {goals.length > 0
                ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
                : 0}
              %
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              평균 달성률
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <AnimatedButton
            title="새 목표 만들기"
            onPress={() => setShowCreateModal(true)}
            variant="primary"
            size="medium"
            icon="add-circle"
            style={styles.createButton}
          />

          <AnimatedButton
            title="템플릿 사용"
            onPress={() => setShowTemplates(true)}
            variant="secondary"
            size="medium"
            icon="albums"
            style={styles.templateButton}
          />
        </View>

        <View style={styles.goalsContainer}>
          {goals.length > 0 ? (
            goals.map(renderGoalCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                아직 설정된 목표가 없습니다
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                첫 번째 목표를 만들어 골프 실력 향상을 시작해보세요!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>새 목표 만들기</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>목표 제목 *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="예: 평균 스코어 85 달성"
                placeholderTextColor={theme.colors.textSecondary}
                value={newGoal.title}
                onChangeText={(text) => setNewGoal((prev) => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>목표 설명</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.multilineInput,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="목표에 대한 자세한 설명을 입력하세요"
                placeholderTextColor={theme.colors.textSecondary}
                value={newGoal.description}
                onChangeText={(text) => setNewGoal((prev) => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>목표값 *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newGoal.targetValue.toString()}
                  onChangeText={(text) =>
                    setNewGoal((prev) => ({ ...prev, targetValue: parseFloat(text) || 0 }))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>단위</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="타, %, yards 등"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newGoal.unit}
                  onChangeText={(text) => setNewGoal((prev) => ({ ...prev, unit: text }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>목표 기한</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                value={newGoal.deadline}
                onChangeText={(text) => setNewGoal((prev) => ({ ...prev, deadline: text }))}
              />
            </View>

            <View style={styles.modalActions}>
              <AnimatedButton
                title="목표 생성"
                onPress={createGoal}
                variant="primary"
                size="large"
                style={styles.createGoalButton}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Template Selector Modal */}
      <Modal
        visible={showTemplates}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTemplates(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>목표 템플릿 선택</Text>
            <TouchableOpacity onPress={() => setShowTemplates(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {goalTemplates.map(renderTemplateCard)}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 15,
  },
  createButton: {
    flex: 1,
  },
  templateButton: {
    flex: 1,
  },
  goalsContainer: {
    gap: 15,
  },
  goalCard: {
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  goalDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressSection: {
    marginBottom: 15,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 12,
  },
  milestonesContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  milestone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    paddingTop: 20,
  },
  createGoalButton: {
    marginBottom: 20,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  templateIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  templateInfo: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  templateDescription: {
    fontSize: 14,
    marginBottom: 5,
  },
  templateDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GoalSettingScreen;
