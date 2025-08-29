import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  type: 'user' | 'coach';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface CoachPersonality {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ChatRequest {
  message: string;
  personality: string;
  conversationId?: string;
}

interface ChatResponse {
  response: string;
  suggestions?: string[];
  conversationId: string;
}

const AICoachScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'coach',
      content:
        '안녕하세요! 저는 당신의 전용 골프 AI 코치입니다. 골프와 관련된 어떤 질문이든 편하게 물어보세요!',
      timestamp: new Date(),
      suggestions: [
        '백스윙을 개선하고 싶어요',
        '퍼팅 실력을 늘리고 싶습니다',
        '드라이버 거리를 늘리려면?',
        '긴장하지 않는 방법은?',
      ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState('encouraging');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const personalities: CoachPersonality[] = [
    { id: 'encouraging', name: '격려형', emoji: '😊', description: '친근하고 격려하는 스타일' },
    { id: 'analytical', name: '분석형', emoji: '🔬', description: '데이터와 기술 중심' },
    { id: 'friendly', name: '친근형', emoji: '😄', description: '편안하고 재미있는 대화' },
    { id: 'strict', name: '엄격형', emoji: '💪', description: '체계적이고 집중적 훈련' },
  ];

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    const currentInputText = inputText.trim();
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setError(null);

    try {
      const requestData: ChatRequest = {
        message: currentInputText,
        personality: selectedPersonality,
        conversationId: conversationId || undefined,
      };

      const response = await fetch(API_ENDPOINTS.aiCoach, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestData),
      });

      const result: ApiResponse<ChatResponse> = await response.json();

      if (result.success && result.data) {
        const coachMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'coach',
          content: result.data.response,
          timestamp: new Date(),
          suggestions: result.data.suggestions,
        };

        setMessages((prev) => [...prev, coachMessage]);
        setConversationId(result.data.conversationId);
      } else {
        throw new Error(result.error || 'Failed to get AI response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');

      // Fallback to mock response for demo
      const response = getCoachResponse(currentInputText, selectedPersonality);
      const coachMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'coach',
        content: response.response,
        timestamp: new Date(),
        suggestions: response.suggestions,
      };

      setMessages((prev) => [...prev, coachMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getCoachResponse = (userMessage: string, personality: string) => {
    const responses: Record<string, { response: string; suggestions: string[] }> = {
      encouraging: {
        response: `훌륭한 질문이네요! ${userMessage}에 대해 말씀드리자면, 모든 골퍼들이 겪는 자연스러운 과정이에요. 꾸준한 연습과 올바른 자세만 있다면 반드시 개선될 수 있습니다!`,
        suggestions: ['구체적인 연습 방법은?', '얼마나 연습해야 할까요?', '다른 팁도 있나요?'],
      },
      analytical: {
        response: `데이터 분석 결과, ${userMessage}와 관련된 문제는 보통 3가지 요인으로 발생합니다: 1) 스윙 평면 2) 임팩트 타이밍 3) 체중 이동. 정확한 측정과 단계적 교정이 필요합니다.`,
        suggestions: ['스윙 평면 교정법은?', '임팩트 타이밍 연습법?', '체중 이동 체크법?'],
      },
      friendly: {
        response: `아하! ${userMessage} 이거 정말 많은 분들이 궁금해하는 부분이에요 😊 사실 저도 처음엔 똑같은 고민을 했거든요. 재미있게 접근하는 게 가장 중요해요!`,
        suggestions: ['재미있는 연습법?', '동기부여 방법은?', '다른 골퍼들은 어떻게?'],
      },
      strict: {
        response: `${userMessage}에 대한 체계적 접근이 필요합니다. 1단계: 기본 자세 점검, 2단계: 스윙 메커니즘 교정, 3단계: 반복 훈련. 매일 30분 연습 필수입니다. 집중하십시오.`,
        suggestions: ['정확한 연습 스케줄?', '자세 체크포인트?', '실력 측정 방법?'],
      },
    };

    return responses[personality] || responses.encouraging;
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  const handlePersonalityChange = (personalityId: string) => {
    setSelectedPersonality(personalityId);
    // Clear conversation when personality changes
    setConversationId(null);

    // Add a system message about the personality change
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      type: 'coach',
      content: `${personalities.find((p) => p.id === personalityId)?.name} 모드로 변경되었습니다. 이제 다른 스타일로 대화할 수 있어요!`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, systemMessage]);
  };

  const clearConversation = () => {
    Alert.alert('대화 지우기', '모든 대화 내용을 지우시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => {
          setMessages([
            {
              id: '1',
              type: 'coach',
              content:
                '안녕하세요! 새로 시작합니다. 골프와 관련된 어떤 질문이든 편하게 물어보세요!',
              timestamp: new Date(),
              suggestions: [
                '백스윙을 개선하고 싶어요',
                '퍼팅 실력을 늘리고 싶습니다',
                '드라이버 거리를 늘리려면?',
                '긴장하지 않는 방법은?',
              ],
            },
          ]);
          setConversationId(null);
          setError(null);
        },
      },
    ]);
  };

  const currentPersonality = personalities.find((p) => p.id === selectedPersonality)!;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>🤖 AI 골프 코치</Text>
            <Text style={styles.headerSubtitle}>24/7 개인 맞춤 레슨</Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation?.navigate('Chat', { roomId: 'ai_coach' })}
          >
            <Ionicons name="chatbubbles" size={24} color="white" />
            <Text style={styles.chatButtonText}>실시간 채팅</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Personality Selector */}
      <View style={styles.personalityContainer}>
        <Text style={styles.personalityLabel}>코치 성격:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.personalityScroll}
        >
          {personalities.map((personality) => (
            <TouchableOpacity
              key={personality.id}
              style={[
                styles.personalityButton,
                selectedPersonality === personality.id && styles.selectedPersonality,
              ]}
              onPress={() => handlePersonalityChange(personality.id)}
            >
              <Text style={styles.personalityEmoji}>{personality.emoji}</Text>
              <Text style={styles.personalityName}>{personality.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
      >
        {messages.map((message) => (
          <View key={message.id}>
            <View
              style={[
                styles.messageContainer,
                message.type === 'user' ? styles.userMessage : styles.coachMessage,
              ]}
            >
              <View style={styles.messageHeader}>
                {message.type === 'coach' && (
                  <Text style={styles.messageEmoji}>{currentPersonality.emoji}</Text>
                )}
                <Text style={styles.messageContent}>{message.content}</Text>
              </View>
              <Text style={styles.timestamp}>{message.timestamp.toLocaleTimeString()}</Text>
            </View>

            {/* Suggestions */}
            {message.suggestions && message.type === 'coach' && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>💡 추천 질문:</Text>
                <View style={styles.suggestionsGrid}>
                  {message.suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionButton}
                      onPress={() => handleSuggestionPress(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <View style={[styles.messageContainer, styles.coachMessage]}>
            <View style={styles.typingContainer}>
              <Text style={styles.messageEmoji}>{currentPersonality.emoji}</Text>
              <View style={styles.typingDots}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.typingText}>입력 중...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color="#ff6b35" />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={16} color="#ff6b35" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="골프에 대해 질문해보세요..."
            multiline
            maxLength={500}
            editable={!isTyping}
          />
          <TouchableOpacity style={styles.clearButton} onPress={clearConversation}>
            <Ionicons name="refresh" size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.disabledButton]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.personalityInfo}>
          현재 {currentPersonality.name} 모드 • {currentPersonality.description}
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 30,
    paddingTop: 50,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chatButtonText: {
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
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  personalityContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  personalityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginLeft: 10,
  },
  personalityScroll: {
    flexDirection: 'row',
  },
  personalityButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  selectedPersonality: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  personalityEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  personalityName: {
    fontSize: 12,
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 15,
    borderBottomRightRadius: 5,
  },
  coachMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 15,
    borderBottomLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageEmoji: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  messageContent: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  suggestionsContainer: {
    marginBottom: 15,
    marginLeft: 20,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  suggestionText: {
    fontSize: 12,
    color: '#333',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 80,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#667eea',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  personalityInfo: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#ff6b35',
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default AICoachScreen;
