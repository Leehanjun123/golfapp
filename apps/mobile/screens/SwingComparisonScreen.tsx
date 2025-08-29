import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineAwareAPI } from '../contexts/OfflineContext';
import { API_ENDPOINTS } from '../config/api';

const { width, height } = Dimensions.get('window');

interface SwingData {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  analysisData: {
    backswingAngle: number;
    impactPosition: number;
    followThroughAngle: number;
    clubHeadSpeed: number;
    ballSpeed: number;
    launchAngle: number;
    spinRate: number;
    carryDistance: number;
  };
  score: number;
  timestamp: string;
  isProfessional?: boolean;
  professionalInfo?: {
    name: string;
    ranking: number;
    tournamentWins: number;
  };
}

interface ComparisonMetric {
  id: string;
  name: string;
  unit: string;
  myValue: number;
  compareValue: number;
  difference: number;
  percentageDiff: number;
  isGood: boolean;
}

const SwingComparisonScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { makeRequest, isConnected } = useOfflineAwareAPI();

  const [mySwings, setMySwings] = useState<SwingData[]>([]);
  const [professionalSwings, setProfessionalSwings] = useState<SwingData[]>([]);
  const [selectedMySwing, setSelectedMySwing] = useState<SwingData | null>(null);
  const [selectedCompareSwing, setSelectedCompareSwing] = useState<SwingData | null>(null);
  const [comparisonMetrics, setComparisonMetrics] = useState<ComparisonMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSwingSelector, setShowSwingSelector] = useState(false);
  const [selectorType, setSelectorType] = useState<'my' | 'compare'>('my');

  useEffect(() => {
    loadSwingData();
  }, []);

  useEffect(() => {
    if (selectedMySwing && selectedCompareSwing) {
      calculateComparison();
    }
  }, [selectedMySwing, selectedCompareSwing]);

  const loadSwingData = async () => {
    try {
      setLoading(true);

      const [mySwingsResponse, proSwingsResponse] = await Promise.all([
        makeRequest(
          `${API_ENDPOINTS.swingAnalysis}/my`,
          { headers: token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {} },
          'my_swings'
        ),
        makeRequest(`${API_ENDPOINTS.swingAnalysis}/professionals`, {}, 'professional_swings'),
      ]);

      if (mySwingsResponse.ok) {
        const myData = await mySwingsResponse.json();
        if (myData.success && myData.data) {
          setMySwings(myData.data);
          if (myData.data.length > 0) {
            setSelectedMySwing(myData.data[0]);
          }
        }
      }

      if (proSwingsResponse.ok) {
        const proData = await proSwingsResponse.json();
        if (proData.success && proData.data) {
          setProfessionalSwings(proData.data);
          if (proData.data.length > 0) {
            setSelectedCompareSwing(proData.data[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load swing data:', error);
      Alert.alert('오류', '스윙 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const calculateComparison = () => {
    if (!selectedMySwing || !selectedCompareSwing) return;

    const myData = selectedMySwing.analysisData;
    const compareData = selectedCompareSwing.analysisData;

    const metrics: ComparisonMetric[] = [
      {
        id: 'clubHeadSpeed',
        name: '클럽 헤드 스피드',
        unit: 'mph',
        myValue: myData.clubHeadSpeed,
        compareValue: compareData.clubHeadSpeed,
        difference: myData.clubHeadSpeed - compareData.clubHeadSpeed,
        percentageDiff:
          ((myData.clubHeadSpeed - compareData.clubHeadSpeed) / compareData.clubHeadSpeed) * 100,
        isGood: myData.clubHeadSpeed >= compareData.clubHeadSpeed * 0.9,
      },
      {
        id: 'ballSpeed',
        name: '볼 스피드',
        unit: 'mph',
        myValue: myData.ballSpeed,
        compareValue: compareData.ballSpeed,
        difference: myData.ballSpeed - compareData.ballSpeed,
        percentageDiff: ((myData.ballSpeed - compareData.ballSpeed) / compareData.ballSpeed) * 100,
        isGood: myData.ballSpeed >= compareData.ballSpeed * 0.9,
      },
      {
        id: 'launchAngle',
        name: '런치 앵글',
        unit: '°',
        myValue: myData.launchAngle,
        compareValue: compareData.launchAngle,
        difference: myData.launchAngle - compareData.launchAngle,
        percentageDiff:
          ((myData.launchAngle - compareData.launchAngle) / compareData.launchAngle) * 100,
        isGood: Math.abs(myData.launchAngle - compareData.launchAngle) <= 2,
      },
      {
        id: 'carryDistance',
        name: '캐리 거리',
        unit: 'yards',
        myValue: myData.carryDistance,
        compareValue: compareData.carryDistance,
        difference: myData.carryDistance - compareData.carryDistance,
        percentageDiff:
          ((myData.carryDistance - compareData.carryDistance) / compareData.carryDistance) * 100,
        isGood: myData.carryDistance >= compareData.carryDistance * 0.85,
      },
      {
        id: 'backswingAngle',
        name: '백스윙 앵글',
        unit: '°',
        myValue: myData.backswingAngle,
        compareValue: compareData.backswingAngle,
        difference: myData.backswingAngle - compareData.backswingAngle,
        percentageDiff:
          ((myData.backswingAngle - compareData.backswingAngle) / compareData.backswingAngle) * 100,
        isGood: Math.abs(myData.backswingAngle - compareData.backswingAngle) <= 10,
      },
    ];

    setComparisonMetrics(metrics);
  };

  const openSwingSelector = (type: 'my' | 'compare') => {
    setSelectorType(type);
    setShowSwingSelector(true);
  };

  const selectSwing = (swing: SwingData) => {
    if (selectorType === 'my') {
      setSelectedMySwing(swing);
    } else {
      setSelectedCompareSwing(swing);
    }
    setShowSwingSelector(false);
  };

  const renderSwingCard = (swing: SwingData, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      style={[
        styles.swingCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onPress}
    >
      {swing.thumbnailUrl && (
        <Image source={{ uri: swing.thumbnailUrl }} style={styles.swingThumbnail} />
      )}
      <View style={styles.swingInfo}>
        <Text style={[styles.swingUserName, { color: theme.colors.text }]}>
          {swing.isProfessional ? swing.professionalInfo?.name : swing.userName}
        </Text>
        {swing.isProfessional && swing.professionalInfo && (
          <Text style={[styles.swingDetails, { color: theme.colors.textSecondary }]}>
            세계 랭킹 #{swing.professionalInfo.ranking} • {swing.professionalInfo.tournamentWins}승
          </Text>
        )}
        <View style={styles.swingStats}>
          <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
            {swing.analysisData.clubHeadSpeed}mph • {swing.analysisData.carryDistance}yds
          </Text>
        </View>
      </View>
      {isSelected && (
        <View style={[styles.selectedBadge, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="checkmark" size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderComparisonMetric = (metric: ComparisonMetric) => {
    const progressPercentage = Math.min(Math.abs(metric.percentageDiff), 100);

    return (
      <View key={metric.id} style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.metricHeader}>
          <Text style={[styles.metricName, { color: theme.colors.text }]}>{metric.name}</Text>
          <View
            style={[
              styles.metricBadge,
              {
                backgroundColor: metric.isGood
                  ? theme.colors.success + '20'
                  : theme.colors.warning + '20',
              },
            ]}
          >
            <Ionicons
              name={metric.isGood ? 'checkmark-circle' : 'warning'}
              size={16}
              color={metric.isGood ? theme.colors.success : theme.colors.warning}
            />
          </View>
        </View>

        <View style={styles.metricValues}>
          <View style={styles.valueColumn}>
            <Text style={[styles.valueLabel, { color: theme.colors.textSecondary }]}>내 기록</Text>
            <Text style={[styles.valueNumber, { color: theme.colors.primary }]}>
              {metric.myValue.toFixed(1)}
              {metric.unit}
            </Text>
          </View>

          <View style={styles.valueColumn}>
            <Text style={[styles.valueLabel, { color: theme.colors.textSecondary }]}>
              비교 대상
            </Text>
            <Text style={[styles.valueNumber, { color: theme.colors.text }]}>
              {metric.compareValue.toFixed(1)}
              {metric.unit}
            </Text>
          </View>
        </View>

        <View style={styles.differenceContainer}>
          <Text style={[styles.differenceLabel, { color: theme.colors.textSecondary }]}>
            차이: {metric.difference > 0 ? '+' : ''}
            {metric.difference.toFixed(1)}
            {metric.unit}({metric.percentageDiff > 0 ? '+' : ''}
            {metric.percentageDiff.toFixed(1)}%)
          </Text>

          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor: metric.isGood ? theme.colors.success : theme.colors.warning,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          스윙 데이터를 불러오는 중...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>스윙 비교 분석</Text>
        <Text style={styles.headerSubtitle}>프로와 내 스윙을 비교해보세요</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Swing Selection */}
        <View style={styles.swingSelection}>
          <View style={styles.selectionColumn}>
            <Text style={[styles.columnTitle, { color: theme.colors.text }]}>내 스윙</Text>
            {selectedMySwing ? (
              renderSwingCard(selectedMySwing, true, () => openSwingSelector('my'))
            ) : (
              <TouchableOpacity
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() => openSwingSelector('my')}
              >
                <Ionicons name="add-circle" size={40} color={theme.colors.primary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  스윙 선택
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.vsContainer}>
            <Text style={[styles.vsText, { color: theme.colors.primary }]}>VS</Text>
          </View>

          <View style={styles.selectionColumn}>
            <Text style={[styles.columnTitle, { color: theme.colors.text }]}>비교 대상</Text>
            {selectedCompareSwing ? (
              renderSwingCard(selectedCompareSwing, true, () => openSwingSelector('compare'))
            ) : (
              <TouchableOpacity
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() => openSwingSelector('compare')}
              >
                <Ionicons name="add-circle" size={40} color={theme.colors.primary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  비교 대상 선택
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Comparison Metrics */}
        {comparisonMetrics.length > 0 && (
          <View style={styles.metricsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>상세 비교 분석</Text>
            {comparisonMetrics.map(renderComparisonMetric)}
          </View>
        )}
      </ScrollView>

      {/* Swing Selector Modal */}
      <Modal
        visible={showSwingSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSwingSelector(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectorType === 'my' ? '내 스윙 선택' : '비교 대상 선택'}
            </Text>
            <TouchableOpacity onPress={() => setShowSwingSelector(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {(selectorType === 'my' ? mySwings : professionalSwings).map((swing) =>
              renderSwingCard(
                swing,
                selectorType === 'my'
                  ? swing.id === selectedMySwing?.id
                  : swing.id === selectedCompareSwing?.id,
                () => selectSwing(swing)
              )
            )}
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
  swingSelection: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  selectionColumn: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  vsContainer: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  swingCard: {
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
  },
  swingThumbnail: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  swingInfo: {
    alignItems: 'center',
  },
  swingUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  swingDetails: {
    fontSize: 12,
    marginBottom: 5,
  },
  swingStats: {
    marginTop: 5,
  },
  statText: {
    fontSize: 12,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: 15,
    padding: 30,
    marginHorizontal: 5,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
  },
  metricsContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  metricCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  metricName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricBadge: {
    padding: 5,
    borderRadius: 15,
  },
  metricValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  valueColumn: {
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  valueNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  differenceContainer: {
    marginTop: 10,
  },
  differenceLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
});

export default SwingComparisonScreen;
