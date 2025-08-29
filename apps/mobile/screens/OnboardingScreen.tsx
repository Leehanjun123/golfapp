import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string[];
  features: string[];
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: '환영합니다! 🎉',
      description: 'Golf AI Coach와 함께\n프로급 골프 실력을 만들어보세요',
      icon: 'golf',
      color: ['#667eea', '#764ba2'],
      features: ['95% 정확도 AI 스윙 분석', '개인 맞춤 훈련 계획', '프로 골퍼와 실시간 비교'],
    },
    {
      id: 2,
      title: '🤖 AI 스윙 분석',
      description: '최첨단 AI로 당신의 스윙을\n프레임별로 정밀 분석합니다',
      icon: 'camera',
      color: ['#4CAF50', '#2E7D32'],
      features: [
        '4개 AI 모델 앙상블 분석',
        '어드레스부터 팔로우스루까지',
        '실시간 개선 포인트 제시',
      ],
    },
    {
      id: 3,
      title: '📊 개인 맞춤 AI',
      description: '당신만의 AI가 학습하며\n점점 더 정확한 분석을 제공합니다',
      icon: 'bulb',
      color: ['#FF6B6B', '#FF8E53'],
      features: ['개인 데이터로 AI 재학습', '맞춤형 훈련 계획 생성', '연속 학습으로 정확도 향상'],
    },
    {
      id: 4,
      title: '🏆 소셜 챌린지',
      description: '친구들과 경쟁하며\n재미있게 실력을 향상시키세요',
      icon: 'people',
      color: ['#4ECDC4', '#44A08D'],
      features: ['실시간 리더보드 경쟁', '주간/월간 챌린지 참여', '친구 초대 및 성과 공유'],
    },
    {
      id: 5,
      title: '🚀 시작할 준비 완료!',
      description: '이제 Golf AI Coach와 함께\n골프 여정을 시작해보세요',
      icon: 'rocket',
      color: ['#9C27B0', '#673AB7'],
      features: [
        '무료 스윙 분석 5회 제공',
        '기본 훈련 계획 이용 가능',
        '언제든 프리미엄 업그레이드',
      ],
    },
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      onComplete();
    }
  };

  return (
    <LinearGradient colors={currentStepData.color} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Skip Button */}
      {currentStep < steps.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={currentStepData.icon as any} size={80} color="white" />
        </View>

        {/* Title and Description */}
        <Text style={styles.title}>{currentStepData.title}</Text>
        <Text style={styles.description}>{currentStepData.description}</Text>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          {currentStepData.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Progress Dots */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[styles.progressDot, index === currentStep && styles.activeDot]}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, currentStep === 0 && styles.disabledButton]}
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={currentStep === 0 ? 'rgba(255,255,255,0.3)' : 'white'}
            />
            <Text style={[styles.navButtonText, currentStep === 0 && styles.disabledText]}>
              이전
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? '시작하기' : '다음'}
            </Text>
            <Ionicons
              name={currentStep === steps.length - 1 ? 'rocket' : 'chevron-forward'}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  skipText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },
  featuresContainer: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 12,
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    minWidth: 100,
  },
  disabledButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  disabledText: {
    color: 'rgba(255,255,255,0.3)',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  nextButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default OnboardingScreen;
