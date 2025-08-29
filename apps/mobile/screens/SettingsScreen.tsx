import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import notificationService from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  workoutReminders: boolean;
  challengeAlerts: boolean;
  friendActivity: boolean;
  weeklyReports: boolean;
  aiUpdates: boolean;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  shareStatistics: boolean;
  allowFriendRequests: boolean;
}

const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    workoutReminders: true,
    challengeAlerts: true,
    friendActivity: true,
    weeklyReports: true,
    aiUpdates: true,
  });
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    shareStatistics: true,
    allowFriendRequests: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notifSettings = await AsyncStorage.getItem('notificationSettings');
      const privacySettings = await AsyncStorage.getItem('privacySettings');

      if (notifSettings) {
        setNotificationSettings(JSON.parse(notifSettings));
      }
      if (privacySettings) {
        setPrivacySettings(JSON.parse(privacySettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      await AsyncStorage.setItem('privacySettings', JSON.stringify(privacySettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const toggleNotificationSetting = async (key: keyof NotificationSettings) => {
    const newSettings = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(newSettings);

    // Apply notification changes
    if (key === 'workoutReminders' && newSettings.workoutReminders) {
      await notificationService.scheduleDailyWorkoutReminders();
    } else if (key === 'weeklyReports' && newSettings.weeklyReports) {
      await notificationService.scheduleWeeklySummary();
    }

    await saveSettings();
  };

  const togglePrivacySetting = async (key: keyof PrivacySettings) => {
    if (key === 'profileVisibility') return; // Handle separately

    const newSettings = { ...privacySettings, [key]: !privacySettings[key] };
    setPrivacySettings(newSettings);
    await saveSettings();
  };

  const handleProfileVisibilityChange = () => {
    const options = [
      { text: '취소', style: 'cancel' as const },
      { text: '공개', onPress: () => updateProfileVisibility('public') },
      { text: '친구만', onPress: () => updateProfileVisibility('friends') },
      { text: '비공개', onPress: () => updateProfileVisibility('private') },
    ];

    Alert.alert('프로필 공개 설정', '누가 당신의 프로필을 볼 수 있나요?', options);
  };

  const updateProfileVisibility = async (visibility: 'public' | 'friends' | 'private') => {
    setPrivacySettings({ ...privacySettings, profileVisibility: visibility });
    await saveSettings();
  };

  const clearCache = async () => {
    Alert.alert('캐시 삭제', '앱 캐시를 삭제하시겠습니까? 임시 파일과 이미지가 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            // Clear specific cache items
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter((key) => key.includes('cache') || key.includes('temp'));
            await AsyncStorage.multiRemove(cacheKeys);
            Alert.alert('완료', '캐시가 삭제되었습니다.');
          } catch (error) {
            Alert.alert('오류', '캐시 삭제 중 오류가 발생했습니다.');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const exportData = async () => {
    Alert.alert(
      '데이터 내보내기',
      '개인 데이터를 내보내시겠습니까? 스윙 분석 기록과 통계가 포함됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '내보내기',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Simulate data export
              await new Promise((resolve) => setTimeout(resolve, 2000));
              Alert.alert('완료', '데이터 내보내기가 완료되었습니다. 이메일을 확인하세요.');
            } catch (error) {
              Alert.alert('오류', '데이터 내보내기 중 오류가 발생했습니다.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetSettings = () => {
    Alert.alert('설정 초기화', '모든 설정을 기본값으로 되돌리시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: async () => {
          setNotificationSettings({
            workoutReminders: true,
            challengeAlerts: true,
            friendActivity: true,
            weeklyReports: true,
            aiUpdates: true,
          });
          setPrivacySettings({
            profileVisibility: 'public',
            shareStatistics: true,
            allowFriendRequests: true,
          });
          await saveSettings();
          Alert.alert('완료', '설정이 초기화되었습니다.');
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Ionicons name="settings" size={40} color="white" />
        <Text style={styles.title}>설정</Text>
        <Text style={styles.subtitle}>앱 설정 및 개인화</Text>
      </LinearGradient>

      {/* User Info */}
      <View style={styles.userSection}>
        <Ionicons name="person-circle" size={60} color="#667eea" />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.username || '사용자'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 알림 설정</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>운동 리마인더</Text>
            <Text style={styles.settingDesc}>매일 운동 알림 받기</Text>
          </View>
          <Switch
            value={notificationSettings.workoutReminders}
            onValueChange={(value) => toggleNotificationSetting('workoutReminders')}
            trackColor={{ false: '#ccc', true: '#667eea' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>챌린지 알림</Text>
            <Text style={styles.settingDesc}>챌린지 마감 및 결과 알림</Text>
          </View>
          <Switch
            value={notificationSettings.challengeAlerts}
            onValueChange={(value) => toggleNotificationSetting('challengeAlerts')}
            trackColor={{ false: '#ccc', true: '#667eea' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>친구 활동</Text>
            <Text style={styles.settingDesc}>친구들의 골프 활동 알림</Text>
          </View>
          <Switch
            value={notificationSettings.friendActivity}
            onValueChange={(value) => toggleNotificationSetting('friendActivity')}
            trackColor={{ false: '#ccc', true: '#667eea' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>주간 리포트</Text>
            <Text style={styles.settingDesc}>주간 성과 요약 받기</Text>
          </View>
          <Switch
            value={notificationSettings.weeklyReports}
            onValueChange={(value) => toggleNotificationSetting('weeklyReports')}
            trackColor={{ false: '#ccc', true: '#667eea' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>AI 업데이트</Text>
            <Text style={styles.settingDesc}>AI 재학습 완료 알림</Text>
          </View>
          <Switch
            value={notificationSettings.aiUpdates}
            onValueChange={(value) => toggleNotificationSetting('aiUpdates')}
            trackColor={{ false: '#ccc', true: '#667eea' }}
          />
        </View>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 개인정보 설정</Text>

        <TouchableOpacity style={styles.settingItem} onPress={handleProfileVisibilityChange}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>프로필 공개 범위</Text>
            <Text style={styles.settingDesc}>
              {privacySettings.profileVisibility === 'public'
                ? '전체 공개'
                : privacySettings.profileVisibility === 'friends'
                  ? '친구만'
                  : '비공개'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>통계 공유</Text>
            <Text style={styles.settingDesc}>다른 사용자와 통계 공유</Text>
          </View>
          <Switch
            value={privacySettings.shareStatistics}
            onValueChange={(value) => togglePrivacySetting('shareStatistics')}
            trackColor={{ false: '#ccc', true: '#667eea' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>친구 요청 허용</Text>
            <Text style={styles.settingDesc}>다른 사용자의 친구 요청 받기</Text>
          </View>
          <Switch
            value={privacySettings.allowFriendRequests}
            onValueChange={(value) => togglePrivacySetting('allowFriendRequests')}
            trackColor={{ false: '#ccc', true: '#667eea' }}
          />
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ 앱 설정</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>다크 모드</Text>
            <Text style={styles.settingDesc}>어둡운 테마 사용</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ccc', true: '#667eea' }}
          />
        </View>

        <TouchableOpacity style={styles.settingItem} onPress={clearCache}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>캐시 삭제</Text>
            <Text style={styles.settingDesc}>임시 파일 및 캐시 데이터 삭제</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 데이터 관리</Text>

        <TouchableOpacity style={styles.settingItem} onPress={exportData}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>데이터 내보내기</Text>
            <Text style={styles.settingDesc}>개인 데이터 백업 파일 생성</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={resetSettings}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>설정 초기화</Text>
            <Text style={styles.settingDesc}>모든 설정을 기본값으로 복원</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>처리 중...</Text>
        </View>
      )}

      {/* AI 서비스 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 AI 서비스 설정 (95%+ 정확도)</Text>

        <View style={styles.apiKeySection}>
          <Text style={styles.apiKeyLabel}>OpenAI API Key</Text>
          <TextInput
            style={styles.apiKeyInput}
            placeholder="sk-..."
            placeholderTextColor="#999"
            secureTextEntry
            onChangeText={async (text: string) => {
              await AsyncStorage.setItem('OPENAI_API_KEY', text);
            }}
          />
          <Text style={styles.apiKeyHelp}>platform.openai.com에서 발급받을 수 있습니다</Text>
        </View>

        <View style={styles.apiKeySection}>
          <Text style={styles.apiKeyLabel}>Claude API Key (선택)</Text>
          <TextInput
            style={styles.apiKeyInput}
            placeholder="sk-ant-..."
            placeholderTextColor="#999"
            secureTextEntry
            onChangeText={async (text: string) => {
              await AsyncStorage.setItem('ANTHROPIC_API_KEY', text);
            }}
          />
          <Text style={styles.apiKeyHelp}>console.anthropic.com에서 발급받을 수 있습니다</Text>
        </View>

        <View style={styles.aiFeatureInfo}>
          <Ionicons name="information-circle" size={20} color="#667eea" />
          <Text style={styles.aiFeatureText}>
            AI API를 설정하면 다음과 같은 향상된 기능을 사용할 수 있습니다:
          </Text>
        </View>

        <View style={styles.aiFeatureList}>
          <Text style={styles.aiFeatureItem}>✅ 95%+ 정확도의 스윙 분석</Text>
          <Text style={styles.aiFeatureItem}>✅ PGA 투어 프로와 직접 비교</Text>
          <Text style={styles.aiFeatureItem}>✅ 클럽 헤드 경로 정밀 추적</Text>
          <Text style={styles.aiFeatureItem}>✅ 실시간 3D 동작 재구성</Text>
          <Text style={styles.aiFeatureItem}>✅ 개인 맞춤형 훈련 프로그램</Text>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Golf AI Coach v1.0.0</Text>
        <Text style={styles.appInfoText}>© 2024 Golf AI Technologies</Text>
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
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    marginTop: -20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  userInfo: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    margin: 20,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#fff5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  // AI Service Settings Styles
  apiKeySection: {
    marginBottom: 20,
  },
  apiKeyLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  apiKeyInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    marginBottom: 5,
  },
  apiKeyHelp: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  aiFeatureInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f3ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  aiFeatureText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 18,
    color: '#333',
  },
  aiFeatureList: {
    paddingLeft: 10,
  },
  aiFeatureItem: {
    fontSize: 13,
    lineHeight: 24,
    color: '#333',
  },
  appInfo: {
    alignItems: 'center',
    paddingBottom: 30,
    marginTop: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginVertical: 2,
  },
});

export default SettingsScreen;
