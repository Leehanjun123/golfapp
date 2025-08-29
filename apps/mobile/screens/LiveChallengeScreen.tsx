import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineAwareAPI } from '../contexts/OfflineContext';
import { API_ENDPOINTS } from '../config/api';
import { AnimatedButton } from '../components/AnimatedButton';

const { width, height } = Dimensions.get('window');

interface LiveChallenge {
  id: string;
  title: string;
  description: string;
  type: 'distance' | 'accuracy' | 'time' | 'score';
  startTime: string;
  endTime: string;
  duration: number; // seconds
  maxParticipants: number;
  currentParticipants: number;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  prize: string;
  rules: string[];
  participants: LiveParticipant[];
  leaderboard: LiveLeaderboardEntry[];
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  isParticipating: boolean;
}

interface LiveParticipant {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: string;
  isReady: boolean;
  currentScore?: number;
  isOnline: boolean;
}

interface LiveLeaderboardEntry {
  rank: number;
  participantId: string;
  participantName: string;
  score: number;
  timestamp: string;
  isCurrentUser: boolean;
}

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const LiveChallengeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const { makeRequest, isConnected } = useOfflineAwareAPI();

  const [challenges, setChallenges] = useState<LiveChallenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<LiveChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [countdown, setCountdown] = useState<CountdownState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [pulseAnim] = useState(new Animated.Value(1));

  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    type: 'distance' as LiveChallenge['type'],
    duration: 300, // 5 minutes
    maxParticipants: 10,
    prize: '',
    rules: '',
  });

  useEffect(() => {
    loadLiveChallenges();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedChallenge && selectedChallenge.status === 'waiting') {
      startCountdown();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedChallenge]);

  useEffect(() => {
    // 펄스 애니메이션
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    pulse();
  }, []);

  const loadLiveChallenges = async () => {
    try {
      setLoading(true);

      const response = await makeRequest(
        `${API_ENDPOINTS.challenges}/live`,
        {
          headers: token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {},
        },
        'live_challenges'
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setChallenges(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load live challenges:', error);
      Alert.alert('오류', '실시간 챌린지를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (!isConnected || !token || token === 'guest') return;

    try {
      // WebSocket URL - ws 사용 (wss는 SSL 인증서 필요)
      const wsUrl = `ws://192.168.45.217:8080/live-challenges?token=${token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Live challenge WebSocket connected');
        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'challenge_created':
              setChallenges((prev) => [data.challenge, ...prev]);
              break;

            case 'challenge_updated':
              setChallenges((prev) =>
                prev.map((c) => (c.id === data.challenge.id ? data.challenge : c))
              );
              if (selectedChallenge?.id === data.challenge.id) {
                setSelectedChallenge(data.challenge);
              }
              break;

            case 'participant_joined':
              updateChallengeParticipants(data.challengeId, data.participant, 'join');
              break;

            case 'participant_left':
              updateChallengeParticipants(data.challengeId, data.participant, 'leave');
              break;

            case 'score_updated':
              updateLeaderboard(data.challengeId, data.score);
              break;

            case 'challenge_started':
              updateChallengeStatus(data.challengeId, 'active');
              break;

            case 'challenge_ended':
              updateChallengeStatus(data.challengeId, 'completed');
              break;
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onclose = () => {
        console.log('Live challenge WebSocket disconnected');
        wsRef.current = null;
        // 재연결 시도
        setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  };

  const createChallenge = async () => {
    if (!newChallenge.title.trim()) {
      Alert.alert('오류', '챌린지 제목을 입력해주세요.');
      return;
    }

    try {
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() + 5); // 5분 후 시작

      const endTime = new Date(startTime);
      endTime.setSeconds(endTime.getSeconds() + newChallenge.duration);

      const response = await makeRequest(`${API_ENDPOINTS.challenges}/live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...newChallenge,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          rules: newChallenge.rules.split('\n').filter((r) => r.trim()),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Alert.alert('성공!', '라이브 챌린지가 생성되었습니다!');
          setShowCreateModal(false);
          resetNewChallenge();
          loadLiveChallenges();
        }
      }
    } catch (error) {
      Alert.alert('오류', '챌린지 생성에 실패했습니다.');
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      const response = await makeRequest(`${API_ENDPOINTS.challenges}/live/${challengeId}/join`, {
        method: 'POST',
        headers: token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Alert.alert('성공!', '챌린지에 참여했습니다!');
          loadLiveChallenges();
        }
      }
    } catch (error) {
      Alert.alert('오류', '참여에 실패했습니다.');
    }
  };

  const leaveChallenge = async (challengeId: string) => {
    Alert.alert('챌린지 나가기', '정말로 이 챌린지에서 나가시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await makeRequest(
              `${API_ENDPOINTS.challenges}/live/${challengeId}/leave`,
              {
                method: 'POST',
                headers: token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {},
              }
            );

            if (response.ok) {
              loadLiveChallenges();
            }
          } catch (error) {
            Alert.alert('오류', '나가기에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const submitScore = async (challengeId: string, score: number) => {
    try {
      const response = await makeRequest(`${API_ENDPOINTS.challenges}/live/${challengeId}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ score }),
      });

      if (response.ok) {
        Alert.alert('성공!', '점수가 제출되었습니다!');
      }
    } catch (error) {
      Alert.alert('오류', '점수 제출에 실패했습니다.');
    }
  };

  const startCountdown = () => {
    if (!selectedChallenge) return;

    intervalRef.current = setInterval(() => {
      const now = new Date().getTime();
      const startTime = new Date(selectedChallenge.startTime).getTime();
      const distance = startTime - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setCountdown({ days, hours, minutes, seconds });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, 1000);
  };

  const updateChallengeParticipants = (
    challengeId: string,
    participant: LiveParticipant,
    action: 'join' | 'leave'
  ) => {
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id === challengeId) {
          let updatedParticipants = [...challenge.participants];

          if (action === 'join') {
            updatedParticipants.push(participant);
          } else {
            updatedParticipants = updatedParticipants.filter((p) => p.id !== participant.id);
          }

          return {
            ...challenge,
            participants: updatedParticipants,
            currentParticipants: updatedParticipants.length,
          };
        }
        return challenge;
      })
    );
  };

  const updateLeaderboard = (challengeId: string, scoreEntry: LiveLeaderboardEntry) => {
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id === challengeId) {
          let updatedLeaderboard = [...challenge.leaderboard];
          const existingIndex = updatedLeaderboard.findIndex(
            (e) => e.participantId === scoreEntry.participantId
          );

          if (existingIndex >= 0) {
            updatedLeaderboard[existingIndex] = scoreEntry;
          } else {
            updatedLeaderboard.push(scoreEntry);
          }

          // 점수별 정렬
          updatedLeaderboard.sort((a, b) => b.score - a.score);
          updatedLeaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
          });

          return { ...challenge, leaderboard: updatedLeaderboard };
        }
        return challenge;
      })
    );
  };

  const updateChallengeStatus = (challengeId: string, status: LiveChallenge['status']) => {
    setChallenges((prev) =>
      prev.map((challenge) => (challenge.id === challengeId ? { ...challenge, status } : challenge))
    );
  };

  const resetNewChallenge = () => {
    setNewChallenge({
      title: '',
      description: '',
      type: 'distance',
      duration: 300,
      maxParticipants: 10,
      prize: '',
      rules: '',
    });
  };

  const getStatusColor = (status: LiveChallenge['status']) => {
    switch (status) {
      case 'waiting':
        return theme.colors.warning;
      case 'active':
        return theme.colors.success;
      case 'completed':
        return theme.colors.textSecondary;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status: LiveChallenge['status']) => {
    switch (status) {
      case 'waiting':
        return '대기 중';
      case 'active':
        return '진행 중';
      case 'completed':
        return '완료';
      case 'cancelled':
        return '취소됨';
      default:
        return '알 수 없음';
    }
  };

  const renderChallenge = ({ item }: { item: LiveChallenge }) => (
    <TouchableOpacity
      style={[styles.challengeCard, { backgroundColor: theme.colors.card }]}
      onPress={() => setSelectedChallenge(item)}
    >
      <View style={styles.challengeHeader}>
        <View style={styles.challengeInfo}>
          <Text style={[styles.challengeTitle, { color: theme.colors.text }]}>{item.title}</Text>
          <Text style={[styles.challengeDescription, { color: theme.colors.textSecondary }]}>
            {item.description}
          </Text>
        </View>

        <View style={styles.challengeStatus}>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>

          {item.status === 'active' && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={[styles.liveIndicator, { backgroundColor: theme.colors.error }]}>
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={styles.challengeDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {item.currentParticipants}/{item.maxParticipants}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {Math.floor(item.duration / 60)}분
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="trophy" size={16} color={theme.colors.warning} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {item.prize}
          </Text>
        </View>
      </View>

      {item.status === 'active' && item.leaderboard.length > 0 && (
        <View style={styles.miniLeaderboard}>
          <Text style={[styles.leaderboardTitle, { color: theme.colors.text }]}>현재 순위</Text>
          {item.leaderboard.slice(0, 3).map((entry) => (
            <View key={entry.participantId} style={styles.leaderboardEntry}>
              <Text style={[styles.rank, { color: theme.colors.textSecondary }]}>
                {entry.rank}.
              </Text>
              <Text
                style={[
                  styles.participantName,
                  { color: entry.isCurrentUser ? theme.colors.primary : theme.colors.text },
                ]}
              >
                {entry.participantName}
              </Text>
              <Text style={[styles.score, { color: theme.colors.text }]}>{entry.score}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          라이브 챌린지를 불러오는 중...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient colors={['#FF6B6B', '#FF8E53']} style={styles.header}>
        <Text style={styles.headerTitle}>🔴 라이브 챌린지</Text>
        <Text style={styles.headerSubtitle}>실시간으로 다른 골퍼들과 경쟁하세요!</Text>
      </LinearGradient>

      <View style={styles.actionBar}>
        <AnimatedButton
          title="새 챌린지 만들기"
          onPress={() => setShowCreateModal(true)}
          variant="primary"
          size="medium"
          icon="add-circle"
          style={styles.createButton}
        />

        <TouchableOpacity
          style={[
            styles.refreshButton,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
          onPress={loadLiveChallenges}
        >
          <Ionicons name="refresh" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={challenges}
        renderItem={renderChallenge}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.challengesList}
        refreshing={loading}
        onRefresh={loadLiveChallenges}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="flash-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              진행 중인 라이브 챌린지가 없습니다
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              새로운 챌린지를 만들어 다른 골퍼들과 실시간으로 경쟁해보세요!
            </Text>
          </View>
        }
      />

      {!isConnected && (
        <View style={[styles.offlineNotice, { backgroundColor: theme.colors.warning + '20' }]}>
          <Ionicons name="wifi-outline" size={16} color={theme.colors.warning} />
          <Text style={[styles.offlineText, { color: theme.colors.warning }]}>
            오프라인 - 실시간 업데이트가 제한됩니다
          </Text>
        </View>
      )}

      {/* Create Challenge Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              새 라이브 챌린지 만들기
            </Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>챌린지 제목</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="예: 드라이브 거리 경쟁!"
                placeholderTextColor={theme.colors.textSecondary}
                value={newChallenge.title}
                onChangeText={(text) => setNewChallenge((prev) => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>설명</Text>
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
                placeholder="챌린지에 대한 설명을 입력하세요"
                placeholderTextColor={theme.colors.textSecondary}
                value={newChallenge.description}
                onChangeText={(text) => setNewChallenge((prev) => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>지속시간 (분)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="5"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={(newChallenge.duration / 60).toString()}
                  onChangeText={(text) =>
                    setNewChallenge((prev) => ({
                      ...prev,
                      duration: (parseInt(text) || 5) * 60,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>최대 참가자</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="10"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newChallenge.maxParticipants.toString()}
                  onChangeText={(text) =>
                    setNewChallenge((prev) => ({
                      ...prev,
                      maxParticipants: parseInt(text) || 10,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <AnimatedButton
              title="챌린지 생성하기"
              onPress={createChallenge}
              variant="primary"
              size="large"
              style={styles.createChallengeButton}
            />
          </View>
        </View>
      </Modal>

      {/* Challenge Detail Modal */}
      <Modal
        visible={selectedChallenge !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedChallenge(null)}
      >
        {selectedChallenge && (
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedChallenge.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedChallenge(null)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {selectedChallenge.status === 'waiting' && (
                <View style={styles.countdownContainer}>
                  <Text style={[styles.countdownLabel, { color: theme.colors.text }]}>
                    시작까지 남은 시간
                  </Text>
                  <View style={styles.countdownDisplay}>
                    {countdown.days > 0 && (
                      <View style={styles.countdownItem}>
                        <Text style={[styles.countdownNumber, { color: theme.colors.primary }]}>
                          {countdown.days}
                        </Text>
                        <Text style={[styles.countdownUnit, { color: theme.colors.textSecondary }]}>
                          일
                        </Text>
                      </View>
                    )}
                    <View style={styles.countdownItem}>
                      <Text style={[styles.countdownNumber, { color: theme.colors.primary }]}>
                        {countdown.hours.toString().padStart(2, '0')}
                      </Text>
                      <Text style={[styles.countdownUnit, { color: theme.colors.textSecondary }]}>
                        시간
                      </Text>
                    </View>
                    <View style={styles.countdownItem}>
                      <Text style={[styles.countdownNumber, { color: theme.colors.primary }]}>
                        {countdown.minutes.toString().padStart(2, '0')}
                      </Text>
                      <Text style={[styles.countdownUnit, { color: theme.colors.textSecondary }]}>
                        분
                      </Text>
                    </View>
                    <View style={styles.countdownItem}>
                      <Text style={[styles.countdownNumber, { color: theme.colors.primary }]}>
                        {countdown.seconds.toString().padStart(2, '0')}
                      </Text>
                      <Text style={[styles.countdownUnit, { color: theme.colors.textSecondary }]}>
                        초
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {selectedChallenge.isParticipating ? (
                <View style={styles.participantActions}>
                  <AnimatedButton
                    title="챌린지 나가기"
                    onPress={() => leaveChallenge(selectedChallenge.id)}
                    variant="secondary"
                    size="large"
                    icon="exit"
                  />

                  {selectedChallenge.status === 'active' && (
                    <AnimatedButton
                      title="점수 제출하기"
                      onPress={() => {
                        // 점수 입력 모달 또는 화면으로 이동
                        Alert.prompt(
                          '점수 제출',
                          '이번 라운드 점수를 입력하세요',
                          (text) => {
                            const score = parseInt(text);
                            if (!isNaN(score)) {
                              submitScore(selectedChallenge.id, score);
                            }
                          },
                          'plain-text',
                          '',
                          'numeric'
                        );
                      }}
                      variant="primary"
                      size="large"
                      icon="golf"
                      style={{ marginTop: 10 }}
                    />
                  )}
                </View>
              ) : (
                <AnimatedButton
                  title="챌린지 참여하기"
                  onPress={() => joinChallenge(selectedChallenge.id)}
                  variant="primary"
                  size="large"
                  icon="flash"
                  disabled={
                    selectedChallenge.currentParticipants >= selectedChallenge.maxParticipants
                  }
                />
              )}

              {selectedChallenge.participants.length > 0 && (
                <View style={styles.participantsSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    참가자 ({selectedChallenge.currentParticipants}/
                    {selectedChallenge.maxParticipants})
                  </Text>
                  <View style={styles.participantsList}>
                    {selectedChallenge.participants.map((participant) => (
                      <View key={participant.id} style={styles.participantItem}>
                        <Text style={[styles.participantName, { color: theme.colors.text }]}>
                          {participant.name}
                        </Text>
                        <View
                          style={[
                            styles.onlineStatus,
                            {
                              backgroundColor: participant.isOnline
                                ? theme.colors.success
                                : theme.colors.textSecondary,
                            },
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {selectedChallenge.leaderboard.length > 0 && (
                <View style={styles.leaderboardSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    실시간 순위
                  </Text>
                  {selectedChallenge.leaderboard.map((entry) => (
                    <View
                      key={entry.participantId}
                      style={[
                        styles.leaderboardItem,
                        {
                          backgroundColor: entry.isCurrentUser
                            ? theme.colors.primary + '10'
                            : 'transparent',
                        },
                      ]}
                    >
                      <View style={styles.rankContainer}>
                        <Text style={[styles.rankNumber, { color: theme.colors.text }]}>
                          #{entry.rank}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.participantName,
                          { color: entry.isCurrentUser ? theme.colors.primary : theme.colors.text },
                        ]}
                      >
                        {entry.participantName}
                      </Text>
                      <Text style={[styles.scoreNumber, { color: theme.colors.text }]}>
                        {entry.score}점
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
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
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  createButton: {
    flex: 1,
    marginRight: 10,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
  },
  challengesList: {
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
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  challengeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  challengeStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  liveIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  challengeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 5,
  },
  miniLeaderboard: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  leaderboardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  rank: {
    width: 25,
    fontSize: 12,
  },
  participantName: {
    flex: 1,
    fontSize: 12,
  },
  score: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
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
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'center',
  },
  offlineText: {
    marginLeft: 5,
    fontSize: 12,
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
  createChallengeButton: {
    marginTop: 20,
  },
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 30,
  },
  countdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  countdownDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  countdownItem: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  countdownUnit: {
    fontSize: 12,
  },
  participantActions: {
    marginBottom: 30,
  },
  participantsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  participantsList: {
    gap: 10,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  onlineStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  leaderboardSection: {
    marginBottom: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  rankContainer: {
    width: 40,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
});

export default LiveChallengeScreen;
