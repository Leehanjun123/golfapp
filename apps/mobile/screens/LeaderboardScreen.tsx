import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, fetchWithTimeout } from '../config/api';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar?: string;
  score: number;
  trend: 'up' | 'down' | 'same';
  rank_change: number;
}

interface LeaderboardData {
  global_rankings: LeaderboardEntry[];
  friends_rankings: LeaderboardEntry[];
  challenge_rankings: LeaderboardEntry[];
  user_position: {
    global_rank: number;
    friends_rank: number;
    total_users: number;
  };
}

const LeaderboardScreen: React.FC = () => {
  const { token, user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'global' | 'friends' | 'challenge'>(
    'global'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await fetchWithTimeout(
        `${API_ENDPOINTS.leaderboard}?category=${selectedCategory}`,
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
        setLeaderboardData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      // No fallback data - show error state instead
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchLeaderboard(true);
  };

  const getCurrentRankings = () => {
    if (!leaderboardData) return [];

    switch (selectedCategory) {
      case 'global':
        return leaderboardData.global_rankings;
      case 'friends':
        return leaderboardData.friends_rankings;
      case 'challenge':
        return leaderboardData.challenge_rankings;
      default:
        return leaderboardData.global_rankings;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}`;
    }
  };

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up') return <Ionicons name="trending-up" size={16} color="#4CAF50" />;
    if (trend === 'down') return <Ionicons name="trending-down" size={16} color="#F44336" />;
    return <Ionicons name="remove" size={16} color="#999" />;
  };

  const addFriend = async (userId: string, username: string) => {
    try {
      const response = await fetchWithTimeout(
        `${API_ENDPOINTS.friends}/add`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ friend_user_id: userId }),
        },
        5000
      );

      if (response.ok) {
        Alert.alert('성공', `${username}님에게 친구 요청을 보냈습니다!`);
      } else {
        Alert.alert('오류', '친구 요청을 보낼 수 없습니다.');
      }
    } catch (err) {
      Alert.alert('오류', '친구 요청 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedCategory]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>리더보드를 불러오는 중...</Text>
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
        <Ionicons name="podium" size={40} color="white" />
        <Text style={styles.title}>리더보드</Text>
        <Text style={styles.subtitle}>실시간 순위 경쟁</Text>
      </LinearGradient>

      {/* User Position Card */}
      {leaderboardData && (
        <View style={styles.userPositionCard}>
          <Text style={styles.userPositionTitle}>내 순위</Text>
          <View style={styles.userPositionStats}>
            <View style={styles.userPositionStat}>
              <Text style={styles.userPositionValue}>
                #{leaderboardData.user_position.global_rank}
              </Text>
              <Text style={styles.userPositionLabel}>글로벌</Text>
            </View>
            <View style={styles.userPositionStat}>
              <Text style={styles.userPositionValue}>
                #{leaderboardData.user_position.friends_rank}
              </Text>
              <Text style={styles.userPositionLabel}>친구</Text>
            </View>
            <View style={styles.userPositionStat}>
              <Text style={styles.userPositionValue}>
                {leaderboardData.user_position.total_users}
              </Text>
              <Text style={styles.userPositionLabel}>총 사용자</Text>
            </View>
          </View>
        </View>
      )}

      {/* Category Selector */}
      <View style={styles.categorySelector}>
        {(
          [
            { key: 'global', label: '글로벌' },
            { key: 'friends', label: '친구' },
            { key: 'challenge', label: '챌린지' },
          ] as const
        ).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryButton,
              selectedCategory === key && styles.selectedCategoryButton,
            ]}
            onPress={() => setSelectedCategory(key)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === key && styles.selectedCategoryButtonText,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rankings List */}
      <View style={styles.rankingsContainer}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === 'global' && '글로벌 순위'}
          {selectedCategory === 'friends' && '친구 순위'}
          {selectedCategory === 'challenge' && '챌린지 순위'}
        </Text>

        {getCurrentRankings().map((entry) => (
          <View
            key={entry.user_id}
            style={[
              styles.rankingCard,
              entry.user_id === (user?.id ? String(user.id) : 'current_user') &&
                styles.currentUserCard,
            ]}
          >
            <View style={styles.rankingLeft}>
              <Text style={[styles.rankNumber, entry.rank <= 3 && styles.topRankNumber]}>
                {getRankIcon(entry.rank)}
              </Text>
              <View style={styles.userInfo}>
                <Text style={styles.username}>{entry.username}</Text>
                <View style={styles.trendContainer}>
                  {getTrendIcon(entry.trend, entry.rank_change)}
                  <Text style={styles.trendText}>
                    {entry.rank_change > 0 && `+${entry.rank_change}`}
                    {entry.rank_change < 0 && entry.rank_change}
                    {entry.rank_change === 0 && '-'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.rankingRight}>
              <Text style={styles.score}>{entry.score.toFixed(1)}</Text>
              {entry.user_id !== (user?.id ? String(user.id) : 'current_user') &&
                selectedCategory === 'global' && (
                  <TouchableOpacity
                    style={styles.addFriendButton}
                    onPress={() => addFriend(entry.user_id, entry.username)}
                  >
                    <Ionicons name="person-add" size={16} color="#667eea" />
                  </TouchableOpacity>
                )}
            </View>
          </View>
        ))}
      </View>

      {/* Tips Section */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>💡 순위 상승 팁</Text>
        <View style={styles.tipCard}>
          <Ionicons name="golf" size={20} color="#667eea" />
          <Text style={styles.tipText}>꾸준한 스윙 연습으로 정확도를 높이세요</Text>
        </View>
        <View style={styles.tipCard}>
          <Ionicons name="people" size={20} color="#4ecdc4" />
          <Text style={styles.tipText}>친구들과 챌린지에 참여해 보너스 점수를 획득하세요</Text>
        </View>
        <View style={styles.tipCard}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.tipText}>주간 챌린지 완료로 랭킹 포인트를 증가시키세요</Text>
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
  userPositionCard: {
    margin: 20,
    marginTop: -20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  userPositionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  userPositionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  userPositionStat: {
    alignItems: 'center',
  },
  userPositionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
  },
  userPositionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  categorySelector: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 4,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  selectedCategoryButton: {
    backgroundColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
  rankingsContainer: {
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
  rankingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  currentUserCard: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    width: 40,
    textAlign: 'center',
  },
  topRankNumber: {
    fontSize: 24,
  },
  userInfo: {
    marginLeft: 15,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trendText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  rankingRight: {
    alignItems: 'center',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  addFriendButton: {
    marginTop: 8,
    padding: 6,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  tipsContainer: {
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
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});

export default LeaderboardScreen;
