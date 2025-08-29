import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Keyboard,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  isTyping?: boolean;
}

interface QuickReply {
  id: string;
  text: string;
  icon: string;
}

const quickReplies: QuickReply[] = [
  { id: '1', text: '스윙 개선 방법', icon: 'golf' },
  { id: '2', text: '드라이버 거리 늘리기', icon: 'trending-up' },
  { id: '3', text: '퍼팅 조언', icon: 'flag' },
  { id: '4', text: '아이언 정확도', icon: 'target' },
  { id: '5', text: '멘탈 관리', icon: 'brain' },
];

export default function AIChatScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // 초기 환영 메시지 및 대화 불러오기
  useEffect(() => {
    loadConversationHistory();
  }, [user]);

  // 대화 내역 저장 (useCallback으로 메모이제이션)
  const saveConversationHistory = useCallback(async (newMessages: Message[]) => {
    try {
      // 최근 100개 메시지만 저장 (메모리 관리)
      const messagesToSave = newMessages.slice(-100);
      await AsyncStorage.setItem('ai_chat_history', JSON.stringify(messagesToSave));
      console.log('대화 저장됨:', messagesToSave.length, '개 메시지');
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }, []);

  // 대화 내역 불러오기
  const loadConversationHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem('ai_chat_history');
      if (saved) {
        const savedMessages = JSON.parse(saved);
        console.log('대화 내역 불러옴:', savedMessages.length, '개 메시지');
        setMessages(savedMessages);
      } else {
        console.log('저장된 대화 없음, 환영 메시지 표시');
        // 처음 사용자는 환영 메시지
        setMessages([
          {
            id: 'welcome',
            content: `안녕하세요, ${user?.username || '골퍼'}님! 👋\n\n저는 당신의 AI 골프 코치입니다. 스윙 분석, 거리 개선, 코스 전략 등 골프와 관련된 모든 것을 도와드릴게요.\n\n무엇이 궁금하신가요?`,
            isUser: false,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
      
      // 페이드인 애니메이션
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  // 타이핑 애니메이션
  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnimation.setValue(0);
    }
  }, [isTyping]);

  // 메시지 전송
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: text,
      isUser: true,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    // 메시지 추가 및 상태 업데이트를 함수형 업데이트로 변경
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText('');
    setIsTyping(true);
    setShowSuggestions(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 키보드 숨기기
    Keyboard.dismiss();

    // AI 응답 받기
    try {
      const response = await fetch(API_ENDPOINTS.aiCoach, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        // 사용자 메시지 상태 업데이트
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
          )
        );

        // AI 응답 추가
        setTimeout(() => {
          const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            content: data.data.message,
            isUser: false,
            timestamp: new Date().toISOString(),
          };
          
          setMessages((prevMessages) => {
            const updatedMessages = prevMessages.map((msg) =>
              msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
            );
            const finalMessages = [...updatedMessages, aiMessage];
            
            // 대화 저장
            saveConversationHistory(finalMessages);
            
            return finalMessages;
          });
          
          setIsTyping(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // 스크롤 하단으로
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }, 1000 + Math.random() * 1000); // 자연스러운 응답 시간
      }
    } catch (error) {
      console.error('AI 응답 오류:', error);
      setIsTyping(false);
      
      // 에러 메시지
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
          isUser: false,
          timestamp: new Date().toISOString(),
        },
      ]);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [token, isLoading, saveConversationHistory]);

  // 빠른 답변 선택
  const handleQuickReply = (reply: QuickReply) => {
    const quickMessages: { [key: string]: string } = {
      '1': '제 스윙을 개선하고 싶은데 어떤 점을 중점적으로 연습해야 할까요?',
      '2': '드라이버 거리를 250야드까지 늘리고 싶습니다. 어떻게 해야 할까요?',
      '3': '3미터 퍼팅 성공률을 높이고 싶어요. 조언 부탁드립니다.',
      '4': '아이언샷 정확도를 높이는 방법을 알려주세요.',
      '5': '중요한 샷 앞에서 긴장됩니다. 멘탈 관리 방법이 있을까요?',
    };
    
    const message = quickMessages[reply.id];
    if (message) {
      sendMessage(message);
    }
  };

  // 메시지 복사
  const copyMessage = async (message: Message) => {
    await Clipboard.setStringAsync(message.content);
    Alert.alert('복사됨', '메시지가 클립보드에 복사되었습니다.');
    setShowMessageMenu(false);
    setSelectedMessage(null);
  };

  // 대화 초기화
  const clearConversation = () => {
    Alert.alert(
      '대화 초기화',
      '모든 대화 내용이 삭제됩니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('ai_chat_history');
            // 환영 메시지만 남기고 초기화
            setMessages([
              {
                id: 'welcome',
                content: `안녕하세요, ${user?.username || '골퍼'}님! 👋\n\n저는 당신의 AI 골프 코치입니다. 스윙 분석, 거리 개선, 코스 전략 등 골프와 관련된 모든 것을 도와드릴게요.\n\n무엇이 궁금하신가요?`,
                isUser: false,
                timestamp: new Date().toISOString(),
              },
            ]);
            Alert.alert('완료', '대화가 초기화되었습니다.');
          },
        },
      ]
    );
  };

  // 메시지 렌더링
  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isTyping) {
      return (
        <View style={[styles.messageBubble, styles.aiMessage, { backgroundColor: theme.colors.card }]}>
          <View style={styles.typingIndicator}>
            <Animated.View
              style={[
                styles.typingDot,
                { 
                  backgroundColor: theme.colors.primary,
                  opacity: typingAnimation,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.typingDot,
                { 
                  backgroundColor: theme.colors.primary,
                  opacity: typingAnimation,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.typingDot,
                { 
                  backgroundColor: theme.colors.primary,
                  opacity: typingAnimation,
                },
              ]}
            />
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => {
          setSelectedMessage(item);
          setShowMessageMenu(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.messageContainer,
            item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
          ]}
        >
          {!item.isUser && (
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                style={styles.aiAvatar}
              >
                <MaterialCommunityIcons name="robot" size={20} color="white" />
              </LinearGradient>
            </View>
          )}
          
          <View
            style={[
              styles.messageBubble,
              item.isUser ? styles.userMessage : styles.aiMessage,
              {
                backgroundColor: item.isUser
                  ? theme.colors.primary
                  : theme.colors.card,
              },
            ]}
          >
          <Text
            style={[
              styles.messageText,
              {
                color: item.isUser ? 'white' : theme.colors.text,
              },
            ]}
          >
            {item.content}
          </Text>
          
          <Text
            style={[
              styles.messageTime,
              {
                color: item.isUser
                  ? 'rgba(255,255,255,0.7)'
                  : theme.colors.textSecondary,
              },
            ]}
          >
            {new Date(item.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {item.isUser && item.status && (
              <Text style={styles.messageStatus}>
                {item.status === 'sending' && ' ⏱'}
                {item.status === 'sent' && ' ✓'}
                {item.status === 'error' && ' ⚠️'}
              </Text>
            )}
          </Text>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  // 타이핑 인디케이터
  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return renderMessage({
      item: {
        id: 'typing',
        content: '',
        isUser: false,
        timestamp: new Date().toISOString(),
        isTyping: true,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="robot" size={28} color="white" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>AI 골프 코치</Text>
                <View style={styles.onlineIndicator}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>온라인</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* 메시지 리스트 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // 새 메시지가 추가되면 하단으로 스크롤
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          onLayout={() => {
            // 초기 로드시 하단으로 스크롤
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }}
          ListFooterComponent={renderTypingIndicator}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={10}
        />

        {/* 빠른 답변 */}
        {messages.length === 1 && (
          <View style={styles.quickRepliesContainer}>
            <Text style={[styles.quickRepliesTitle, { color: theme.colors.textSecondary }]}>
              빠른 질문 선택
            </Text>
            <FlatList
              horizontal
              data={quickReplies}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.quickReplyButton, { backgroundColor: theme.colors.card }]}
                  onPress={() => handleQuickReply(item)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.quickReplyText, { color: theme.colors.text }]}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRepliesList}
            />
          </View>
        )}

        {/* 입력 영역 */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background }]}>
            <TextInput
              style={[styles.textInput, { color: theme.colors.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="메시지를 입력하세요..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={500}
              editable={!isTyping}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim() && !isTyping
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isTyping}
              activeOpacity={0.7}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !isTyping ? 'white' : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* 메시지 메뉴 모달 */}
      <Modal
        visible={showMessageMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMessageMenu(false)}
        >
          <View style={[styles.messageMenuContainer, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={styles.messageMenuItem}
              onPress={() => selectedMessage && copyMessage(selectedMessage)}
            >
              <Ionicons name="copy-outline" size={24} color={theme.colors.text} />
              <Text style={[styles.messageMenuText, { color: theme.colors.text }]}>
                메시지 복사
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  headerGradient: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  messagesList: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginTop: 5,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  userMessage: {
    borderTopRightRadius: 4,
  },
  aiMessage: {
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageStatus: {
    marginLeft: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  quickRepliesContainer: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  quickRepliesTitle: {
    fontSize: 12,
    marginLeft: 15,
    marginBottom: 8,
  },
  quickRepliesList: {
    paddingHorizontal: 15,
  },
  quickReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    borderRadius: 20,
  },
  quickReplyText: {
    fontSize: 13,
    marginLeft: 6,
  },
  inputContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 25,
    paddingLeft: 15,
    paddingRight: 5,
    paddingVertical: 5,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerMenuButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageMenuContainer: {
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  messageMenuText: {
    fontSize: 16,
    marginLeft: 12,
  },
} as const;