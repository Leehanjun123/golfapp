import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatedButton } from './AnimatedButton';
import userLearningService from '../services/userLearningService';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  swingId: string;
  analysisScore: number;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  swingId,
  analysisScore,
}) => {
  const { theme } = useTheme();
  const [accuracy, setAccuracy] = useState(5);
  const [helpful, setHelpful] = useState(true);
  const [corrections, setCorrections] = useState('');
  const [actualResult, setActualResult] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [distance, setDistance] = useState('');
  const [improvement, setImprovement] = useState(0);

  const handleSubmit = async () => {
    await userLearningService.collectUserFeedback(swingId, {
      accuracy,
      helpful,
      corrections: corrections ? corrections.split('\n').filter((c) => c.trim()) : [],
      actualImprovement: improvement,
    });

    onClose();
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setAccuracy(star)}>
            <Ionicons
              name={star <= accuracy ? 'star' : 'star-outline'}
              size={32}
              color={star <= accuracy ? '#FFD700' : '#ccc'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>분석 피드백</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 정확도 평가 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                분석 정확도를 평가해주세요
              </Text>
              <Text style={[styles.scoreText, { color: theme.colors.primary }]}>
                AI 분석 점수: {analysisScore}점
              </Text>
              {renderStars()}
              <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                {accuracy === 5
                  ? '완벽해요!'
                  : accuracy === 4
                    ? '꽤 정확해요'
                    : accuracy === 3
                      ? '보통이에요'
                      : accuracy === 2
                        ? '부정확해요'
                        : '매우 부정확해요'}
              </Text>
            </View>

            {/* 도움 여부 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                이 분석이 도움이 되었나요?
              </Text>
              <View style={styles.helpfulButtons}>
                <TouchableOpacity
                  style={[
                    styles.helpfulButton,
                    helpful && { backgroundColor: theme.colors.success + '20' },
                    { borderColor: helpful ? theme.colors.success : theme.colors.border },
                  ]}
                  onPress={() => setHelpful(true)}
                >
                  <Ionicons
                    name="thumbs-up"
                    size={24}
                    color={helpful ? theme.colors.success : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.helpfulText,
                      { color: helpful ? theme.colors.success : theme.colors.textSecondary },
                    ]}
                  >
                    도움됨
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.helpfulButton,
                    !helpful && { backgroundColor: theme.colors.error + '20' },
                    { borderColor: !helpful ? theme.colors.error : theme.colors.border },
                  ]}
                  onPress={() => setHelpful(false)}
                >
                  <Ionicons
                    name="thumbs-down"
                    size={24}
                    color={!helpful ? theme.colors.error : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.helpfulText,
                      { color: !helpful ? theme.colors.error : theme.colors.textSecondary },
                    ]}
                  >
                    도움 안됨
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 실제 결과 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                실제 샷 결과는 어땠나요?
              </Text>
              <View style={styles.resultButtons}>
                {(['excellent', 'good', 'fair', 'poor'] as const).map((result) => (
                  <TouchableOpacity
                    key={result}
                    style={[
                      styles.resultButton,
                      actualResult === result && { backgroundColor: theme.colors.primary + '20' },
                      {
                        borderColor:
                          actualResult === result ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setActualResult(result)}
                  >
                    <Text
                      style={[
                        styles.resultText,
                        {
                          color: actualResult === result ? theme.colors.primary : theme.colors.text,
                        },
                      ]}
                    >
                      {result === 'excellent'
                        ? '훌륭함'
                        : result === 'good'
                          ? '좋음'
                          : result === 'fair'
                            ? '보통'
                            : '나쁨'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 거리 입력 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                실제 비거리 (선택사항)
              </Text>
              <View style={styles.distanceInput}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="예: 250"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="numeric"
                />
                <Text style={[styles.unitText, { color: theme.colors.textSecondary }]}>야드</Text>
              </View>
            </View>

            {/* 개선사항 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                개선이 느껴지나요?
              </Text>
              <View style={styles.improvementSlider}>
                {[-2, -1, 0, 1, 2].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.improvementButton,
                      improvement === value && {
                        backgroundColor:
                          value > 0
                            ? theme.colors.success + '20'
                            : value < 0
                              ? theme.colors.error + '20'
                              : theme.colors.warning + '20',
                      },
                    ]}
                    onPress={() => setImprovement(value)}
                  >
                    <Text
                      style={[
                        styles.improvementText,
                        {
                          color:
                            improvement === value
                              ? value > 0
                                ? theme.colors.success
                                : value < 0
                                  ? theme.colors.error
                                  : theme.colors.warning
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {value === -2
                        ? '매우\n나빠짐'
                        : value === -1
                          ? '조금\n나빠짐'
                          : value === 0
                            ? '변화\n없음'
                            : value === 1
                              ? '조금\n개선'
                              : '매우\n개선'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 추가 피드백 */}
            {accuracy < 4 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  어떤 부분이 부정확했나요? (선택사항)
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="예: 실제로는 더 많이 굽혀졌는데..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={corrections}
                  onChangeText={setCorrections}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                피드백은 AI 모델을 개선하는데 사용됩니다.{'\n'}더 많은 피드백을 주실수록 더
                정확해집니다!
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <AnimatedButton
              title="피드백 제출"
              onPress={handleSubmit}
              variant="primary"
              size="large"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 10,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 5,
  },
  helpfulButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  helpfulButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
  },
  helpfulText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resultButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '500',
  },
  distanceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  unitText: {
    fontSize: 16,
  },
  improvementSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  improvementButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  improvementText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 15,
    borderRadius: 10,
    gap: 10,
    marginTop: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
});
