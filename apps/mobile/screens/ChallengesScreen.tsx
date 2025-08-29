import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../config/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedButton } from '../components/AnimatedButton';
import { LoadingAnimation } from '../components/LoadingAnimation';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import SortModal from '../components/SortModal';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type?: string;
  category?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'medium' | 'hard';
  participants: number;
  points?: number;
  rewardPoints?: number;
  deadline?: string;
  endDate?: string;
  isActive?: boolean;
  isParticipating?: boolean;
  userScore?: number | null;
  myRank?: number;
  myScore?: number;
  leaderboard: LeaderboardEntry[];
}

interface LeaderboardEntry {
  rank: number;
  userName?: string;
  username?: string;
  score: number;
  isCurrentUser?: boolean;
}

interface UserStats {
  totalChallenges: number;
  completedChallenges?: number;
  totalPoints: number;
  currentRank?: number | null;
  bestRank?: number;
  badges?: string[];
}

const ChallengesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'my'>('active');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortOption, setSortOption] = useState('participants');

  const fetchChallengesData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch(API_ENDPOINTS.challenges, {
        headers: {
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const result = await response.json();

      if (result.success && result.data) {
        setChallenges(result.data.challenges || []);
        setFilteredChallenges(result.data.challenges || []);
        setUserStats(result.data.userStats || null);
      }
    } catch (err) {
      console.error('Error fetching challenges:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const participateInChallenge = async (challenge: Challenge) => {
    if (token === 'guest' || !token) {
      Alert.alert('로그인 필요', '챌린지에 참여하려면 로그인이 필요합니다.');
      return;
    }

    setSelectedChallenge(challenge);
    setShowScoreModal(true);
  };

  const submitScore = async () => {
    if (!selectedChallenge || !scoreInput) {
      Alert.alert('오류', '점수를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.challenges}/${selectedChallenge.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ score: parseFloat(scoreInput) }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('성공!', result.data.message || '챌린지 참여가 완료되었습니다!', [
          {
            text: '확인',
            onPress: () => {
              setShowScoreModal(false);
              setScoreInput('');
              fetchChallengesData();
            },
          },
        ]);
      } else {
        Alert.alert('오류', result.error || '참여에 실패했습니다.');
      }
    } catch (err) {
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchChallengesData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChallenges(challenges);
    } else {
      const filtered = challenges.filter(
        (challenge) =>
          challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          challenge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (challenge.type && challenge.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (challenge.category &&
            challenge.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredChallenges(filtered);
    }
  }, [searchQuery, challenges]);

  const filterGroups = [
    {
      id: 'difficulty',
      title: '난이도',
      multiSelect: true,
      options: [
        { id: 'beginner', label: '초급', value: 'beginner', type: 'checkbox' as const },
        { id: 'intermediate', label: '중급', value: 'intermediate', type: 'checkbox' as const },
        { id: 'medium', label: '중급', value: 'medium', type: 'checkbox' as const },
        { id: 'advanced', label: '고급', value: 'advanced', type: 'checkbox' as const },
        { id: 'hard', label: '고급', value: 'hard', type: 'checkbox' as const },
      ],
    },
    {
      id: 'status',
      title: '상태',
      multiSelect: true,
      options: [
        { id: 'active', label: '진행 중', value: 'active', type: 'checkbox' as const },
        {
          id: 'participating',
          label: '참여 중',
          value: 'participating',
          type: 'checkbox' as const,
        },
      ],
    },
  ];

  const sortOptions = [
    { id: 'participants', label: '참여자 수', field: 'participants', order: 'desc' as const },
    { id: 'points', label: '포인트', field: 'points', order: 'desc' as const },
    { id: 'difficulty', label: '난이도', field: 'difficulty', order: 'asc' as const },
    { id: 'deadline', label: '마감일', field: 'deadline', order: 'asc' as const },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return theme.colors.success;
      case 'intermediate':
      case 'medium':
        return theme.colors.warning || '#FFA500';
      case 'advanced':
      case 'hard':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderChallenge = ({ item }: { item: Challenge }) => {
    const points = item.points || item.rewardPoints || 100;
    const deadline = item.deadline || item.endDate;

    return (
      <TouchableOpacity
        style={[styles.challengeCard, { backgroundColor: theme.colors.card }]}
        onPress={() => participateInChallenge(item)}
      >
        <View style={styles.challengeHeader}>
          <View>
            <Text style={[styles.challengeTitle, { color: theme.colors.text }]}>{item.title}</Text>
            <Text style={[styles.challengeDescription, { color: theme.colors.textSecondary }]}>
              {item.description}
            </Text>
          </View>
          {item.isParticipating && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
          )}
        </View>

        <View style={styles.challengeInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              {item.participants}명 참여
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.difficulty, { color: getDifficultyColor(item.difficulty) }]}>
              {item.difficulty === 'beginner'
                ? '초급'
                : item.difficulty === 'intermediate' || item.difficulty === 'medium'
                  ? '중급'
                  : '고급'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="trophy" size={16} color={theme.colors.warning || '#FFA500'} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>{points}P</Text>
          </View>
        </View>

        {item.userScore !== null && item.userScore !== undefined && (
          <View style={[styles.userScoreBar, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.userScoreText, { color: theme.colors.primary }]}>
              내 점수: {item.userScore}점
            </Text>
          </View>
        )}

        {item.leaderboard && item.leaderboard.length > 0 && (
          <View style={styles.miniLeaderboard}>
            <Text style={[styles.leaderboardTitle, { color: theme.colors.text }]}>TOP 3</Text>
            {item.leaderboard.slice(0, 3).map((entry) => (
              <View key={entry.rank} style={styles.leaderboardEntry}>
                <Text style={[styles.rank, { color: theme.colors.textSecondary }]}>
                  {entry.rank}.
                </Text>
                <Text
                  style={[
                    styles.userName,
                    { color: entry.isCurrentUser ? theme.colors.primary : theme.colors.text },
                  ]}
                >
                  {entry.username || entry.userName}
                </Text>
                <Text style={[styles.score, { color: theme.colors.text }]}>{entry.score}</Text>
              </View>
            ))}
          </View>
        )}

        <AnimatedButton
          title={item.isParticipating ? '점수 업데이트' : '챌린지 참여'}
          onPress={() => participateInChallenge(item)}
          variant={item.isParticipating ? 'secondary' : 'primary'}
          size="small"
          style={styles.participateButton}
        />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <LoadingAnimation size="large" text="챌린지를 불러오는 중..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient colors={['#4ecdc4', '#44a08d']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>소셜 챌린지</Text>
            <Text style={styles.headerSubtitle}>친구들과 실력을 겨뤄보세요!</Text>
          </View>
          <TouchableOpacity
            style={styles.liveButton}
            onPress={() => navigation.navigate('LiveChallenge')}
          >
            <Ionicons name="flash" size={20} color="white" />
            <Text style={styles.liveButtonText}>실시간</Text>
          </TouchableOpacity>
        </View>

        {userStats && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.totalChallenges}</Text>
              <Text style={styles.statLabel}>참여</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.totalPoints}</Text>
              <Text style={styles.statLabel}>포인트</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>#{userStats.currentRank || 'N/A'}</Text>
              <Text style={styles.statLabel}>순위</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <SearchBar
        placeholder="챌린지, 카테고리 검색..."
        onSearchChange={setSearchQuery}
        onFilterPress={() => setShowFilters(true)}
        showFilter={true}
      />

      {filteredChallenges.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
            onPress={() => setShowSort(true)}
          >
            <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
            <Text style={[styles.sortButtonText, { color: theme.colors.primary }]}>정렬</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'active' && { borderBottomColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'active' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            진행 중
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && { borderBottomColor: theme.colors.primary }]}
          onPress={() => setActiveTab('my')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'my' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            내 챌린지
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={
          activeTab === 'active'
            ? filteredChallenges.filter((c) => c.isActive !== false)
            : filteredChallenges.filter((c) => c.isParticipating)
        }
        renderItem={renderChallenge}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchChallengesData(true)}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={60} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {activeTab === 'active' ? '진행 중인 챌린지가 없습니다' : '참여한 챌린지가 없습니다'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={showScoreModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>점수 제출</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              {selectedChallenge?.title}
            </Text>

            <TextInput
              style={[
                styles.scoreInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="점수를 입력하세요"
              placeholderTextColor={theme.colors.textSecondary}
              value={scoreInput}
              onChangeText={setScoreInput}
              keyboardType="numeric"
            />

            {submitting ? (
              <LoadingAnimation size="small" />
            ) : (
              <View style={styles.modalButtons}>
                <AnimatedButton
                  title="제출"
                  onPress={submitScore}
                  variant="primary"
                  size="medium"
                  style={styles.modalButton}
                />
                <AnimatedButton
                  title="취소"
                  onPress={() => {
                    setShowScoreModal(false);
                    setScoreInput('');
                  }}
                  variant="secondary"
                  size="medium"
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={(filters) => {
          // Apply filters to filteredChallenges
          console.log('Applied filters:', filters);
        }}
        filterGroups={filterGroups}
        currentFilters={{}}
      />

      <SortModal
        visible={showSort}
        onClose={() => setShowSort(false)}
        onSelectSort={(sort) => {
          setSortOption(sort.field);
          // Apply sorting logic here
        }}
        sortOptions={sortOptions}
        currentSort={sortOptions.find((opt) => opt.field === sortOption)}
      />
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
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  liveButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
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
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
  },
  challengeCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  challengeDescription: {
    fontSize: 14,
  },
  challengeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 13,
  },
  difficulty: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  userScoreBar: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  userScoreText: {
    fontWeight: 'bold',
  },
  miniLeaderboard: {
    marginBottom: 15,
  },
  leaderboardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  rank: {
    width: 25,
  },
  userName: {
    flex: 1,
  },
  score: {
    fontWeight: '600',
  },
  participateButton: {
    marginTop: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  scoreInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    gap: 10,
  },
  modalButton: {
    marginBottom: 10,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'flex-end',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortButtonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ChallengesScreen;
