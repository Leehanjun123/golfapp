import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineAwareAPI } from '../contexts/OfflineContext';
import { API_ENDPOINTS } from '../config/api';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'system';
  isRead: boolean;
  isCurrentUser: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'ai_coach';
  participants: ChatParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  isOnline: boolean;
  avatar?: string;
}

interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

const ChatScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const { makeRequest, isConnected } = useOfflineAwareAPI();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadChatRooms();
    if (route.params?.roomId) {
      const roomId = route.params.roomId;
      selectChatRoom(roomId);
    }
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      connectWebSocket(selectedRoom.id);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedRoom]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);

      const response = await makeRequest(
        `${API_ENDPOINTS.chat}/rooms`,
        {
          headers: token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {},
        },
        'chat_rooms'
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const rooms = data.data.map((room: any) => ({
            ...room,
            participants: room.participants || [],
          }));
          setChatRooms(rooms);

          // AI Coach 채팅방 자동 생성
          const aiCoachRoom = rooms.find((r: ChatRoom) => r.type === 'ai_coach');
          if (!aiCoachRoom) {
            await createAIChatRoom();
          } else if (!selectedRoom) {
            // AI 코치 채팅방을 기본으로 선택
            selectChatRoom(aiCoachRoom.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      Alert.alert('오류', '채팅방 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const createAIChatRoom = async () => {
    try {
      const response = await makeRequest(`${API_ENDPOINTS.chat}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: 'AI 골프 코치',
          type: 'ai_coach',
          participants: [user?.id, 'ai_coach'],
        }),
      });

      if (response.ok) {
        loadChatRooms();
      }
    } catch (error) {
      console.error('Failed to create AI chat room:', error);
    }
  };

  const selectChatRoom = (roomId: string) => {
    const room = chatRooms.find((r) => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      // AI 코치 채팅방인 경우 환영 메시지 추가
      if (room.type === 'ai_coach') {
        setMessages([
          {
            id: 'welcome-1',
            senderId: 'ai-coach',
            senderName: 'AI 코치',
            content: '안녕하세요! 저는 당신의 AI 골프 코치입니다. 🏌️‍♂️\n\n스윙 분석, 거리 개선, 퍼팅 조언 등 골프와 관련된 모든 질문에 답변해드릴게요. 무엇을 도와드릴까요?',
            timestamp: new Date().toISOString(),
            type: 'text',
            isCurrentUser: false,
          },
        ]);
      } else {
        setMessages([]);
      }
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const response = await makeRequest(
        `${API_ENDPOINTS.chat}/rooms/${roomId}/messages`,
        {
          headers: token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {},
        },
        `chat_messages_${roomId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const formattedMessages = data.data.map((msg: any) => ({
            ...msg,
            isCurrentUser: msg.senderId === user?.id,
          }));
          setMessages(formattedMessages);

          // 메시지 읽음 처리
          markMessagesAsRead(roomId);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const connectWebSocket = (roomId: string) => {
    if (!isConnected || !token || token === 'guest') return;

    try {
      // WebSocket URL - ws 사용 (wss는 SSL 인증서 필요)
      const wsUrl = `ws://192.168.45.217:8080/chat/${roomId}?token=${token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'new_message':
              const newMsg = {
                ...data.message,
                isCurrentUser: data.message.senderId === user?.id,
              };
              setMessages((prev) => [...prev, newMsg]);
              break;

            case 'typing_start':
              if (data.userId !== user?.id) {
                setTypingUsers((prev) => [...prev, data.userName]);
              }
              break;

            case 'typing_stop':
              setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
              break;

            case 'user_online':
            case 'user_offline':
              updateUserOnlineStatus(data.userId, data.type === 'user_online');
              break;
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsRef.current = null;
        // 재연결 시도
        setTimeout(() => {
          if (selectedRoom) {
            connectWebSocket(selectedRoom.id);
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // 사용자 메시지를 즉시 화면에 추가
    const userMessage = {
      id: `user-${Date.now()}`,
      senderId: user?.id || '1',
      senderName: user?.username || '나',
      content: messageContent,
      timestamp: new Date().toISOString(),
      type: 'text',
      isCurrentUser: true,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // WebSocket으로 실시간 전송
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message',  // 서버가 인식하는 타입으로 변경
            text: messageContent,
            roomId: selectedRoom.id,
          })
        );
      }

      // API로도 전송 (백업 및 저장)
      const response = await makeRequest(
        `${API_ENDPOINTS.chat}/rooms/${selectedRoom.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            content: messageContent,
            type: 'text',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // AI 코치 채팅방인 경우 자동 응답 요청
      if (selectedRoom.type === 'ai_coach') {
        setTimeout(() => {
          requestAIResponse(messageContent, selectedRoom.id);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('오류', '메시지 전송에 실패했습니다.');
      setNewMessage(messageContent); // 메시지 복원
    } finally {
      setSending(false);
    }
  };

  const requestAIResponse = async (userMessage: string, roomId: string) => {
    try {
      const response = await makeRequest(API_ENDPOINTS.aiCoach, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          roomId: roomId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // AI 응답을 메시지 리스트에 추가
          const aiMessage = {
            id: Date.now().toString(),
            senderId: 'ai-coach',
            senderName: 'AI 코치',
            content: data.data.message,
            timestamp: data.data.timestamp || new Date().toISOString(),
            type: 'text',
            isCurrentUser: false,
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);
    }
  };

  const markMessagesAsRead = async (roomId: string) => {
    try {
      await makeRequest(`${API_ENDPOINTS.chat}/rooms/${roomId}/read`, {
        method: 'POST',
        headers: token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const updateUserOnlineStatus = (userId: string, isOnline: boolean) => {
    setSelectedRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: prev.participants.map((p) => (p.id === userId ? { ...p, isOnline } : p)),
      };
    });
  };

  const handleTyping = () => {
    if (!isTyping && wsRef.current) {
      setIsTyping(true);
      wsRef.current.send(
        JSON.stringify({
          type: 'typing_start',
          roomId: selectedRoom?.id,
        })
      );

      // 3초 후 타이핑 중단
      setTimeout(() => {
        if (wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: 'typing_stop',
              roomId: selectedRoom?.id,
            })
          );
        }
        setIsTyping(false);
      }, 3000);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[styles.messageContainer, item.isCurrentUser ? styles.myMessage : styles.otherMessage]}
    >
      {!item.isCurrentUser && (
        <View style={styles.senderInfo}>
          {item.senderAvatar && (
            <Image source={{ uri: item.senderAvatar }} style={styles.senderAvatar} />
          )}
          <Text style={[styles.senderName, { color: theme.colors.textSecondary }]}>
            {item.senderName}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: item.isCurrentUser ? theme.colors.primary : theme.colors.card,
          },
        ]}
      >
        <Text
          style={[styles.messageText, { color: item.isCurrentUser ? 'white' : theme.colors.text }]}
        >
          {item.content}
        </Text>

        <Text
          style={[
            styles.messageTime,
            { color: item.isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary },
          ]}
        >
          {formatMessageTime(item.timestamp)}
        </Text>
      </View>

      {item.isCurrentUser && (
        <View style={styles.messageStatus}>
          <Ionicons
            name={item.isRead ? 'checkmark-done' : 'checkmark'}
            size={12}
            color={item.isRead ? theme.colors.success : theme.colors.textSecondary}
          />
        </View>
      )}
    </View>
  );

  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={[
        styles.chatRoomItem,
        {
          backgroundColor:
            selectedRoom?.id === item.id ? theme.colors.primary + '20' : theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={() => setSelectedRoom(item)}
    >
      <View style={styles.roomInfo}>
        {item.avatar && <Image source={{ uri: item.avatar }} style={styles.roomAvatar} />}
        <View style={styles.roomTextInfo}>
          <View style={styles.roomHeader}>
            <Text style={[styles.roomName, { color: theme.colors.text }]}>{item.name}</Text>
            <View style={styles.roomStatus}>
              {item.isOnline && (
                <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.success }]} />
              )}
              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.colors.error }]}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>

          {item.lastMessage && (
            <Text
              style={[styles.lastMessage, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.lastMessage.content}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          채팅을 불러오는 중...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {!selectedRoom ? (
        // 채팅방 목록
        <>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
            <Text style={styles.headerTitle}>채팅</Text>
            <Text style={styles.headerSubtitle}>AI 코치 및 다른 골퍼들과 소통하세요</Text>
          </LinearGradient>

          <FlatList
            data={chatRooms}
            renderItem={renderChatRoom}
            keyExtractor={(item) => item.id}
            style={styles.chatRoomsList}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        // 채팅 화면
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* 채팅 헤더 */}
          <View
            style={[
              styles.chatHeader,
              { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => setSelectedRoom(null)}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.chatHeaderInfo}>
              <Text style={[styles.chatTitle, { color: theme.colors.text }]}>
                {selectedRoom.name}
              </Text>
              {selectedRoom.participants.length > 0 && (
                <Text style={[styles.chatStatus, { color: theme.colors.textSecondary }]}>
                  {selectedRoom.participants.filter((p) => p.isOnline).length}명 온라인
                </Text>
              )}
            </View>

            {selectedRoom.type !== 'ai_coach' && (
              <TouchableOpacity>
                <Ionicons name="call" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* 메시지 목록 */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            showsVerticalScrollIndicator={false}
          />

          {/* 타이핑 인디케이터 */}
          {typingUsers.length > 0 && (
            <View style={[styles.typingContainer, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>
                {typingUsers.join(', ')}님이 입력 중...
              </Text>
            </View>
          )}

          {/* 메시지 입력 */}
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
            ]}
          >
            <TextInput
              style={[
                styles.messageInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="메시지를 입력하세요..."
              placeholderTextColor={theme.colors.textSecondary}
              value={newMessage}
              onChangeText={(text) => {
                setNewMessage(text);
                if (text.length === 1) {
                  handleTyping();
                }
              }}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: newMessage.trim() ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {!isConnected && (
            <View style={[styles.offlineNotice, { backgroundColor: theme.colors.warning + '20' }]}>
              <Ionicons name="wifi-outline" size={16} color={theme.colors.warning} />
              <Text style={[styles.offlineText, { color: theme.colors.warning }]}>
                오프라인 모드 - 메시지가 연결 후 전송됩니다
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
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
  chatRoomsList: {
    flex: 1,
    padding: 20,
  },
  chatRoomItem: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  roomTextInfo: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  roomStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 15,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  chatStatus: {
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  senderAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '100%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 5,
  },
  messageStatus: {
    marginTop: 5,
  },
  typingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default ChatScreen;
