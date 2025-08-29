import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  // Register for push notifications
  async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      try {
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
          })
        ).data;
        console.log('Expo push token:', token);
        this.expoPushToken = token;
      } catch (error) {
        console.error('Error getting push token:', error);
        return null;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  // Get the stored push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Schedule a local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger,
    });

    return notificationId;
  }

  // Send immediate local notification
  async showLocalNotification(title: string, body: string, data?: any): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Show immediately
    });
  }

  // Cancel scheduled notification
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Listen for notification received (foreground)
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Listen for notification response (user tapped)
  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Golf-specific notification templates
  async scheduleWorkoutReminder(timeInSeconds: number): Promise<string> {
    return await this.scheduleLocalNotification(
      '🏋️ 훈련 시간!',
      'AI 맞춤 훈련 계획으로 스윙을 개선해보세요.',
      null, // Immediate notification
      { type: 'workout_reminder' }
    );
  }

  async scheduleChallengeReminder(challengeName: string, hoursLeft: number): Promise<string> {
    return await this.scheduleLocalNotification(
      '🏆 챌린지 마감 임박!',
      `"${challengeName}" 챌린지가 ${hoursLeft}시간 후 마감됩니다.`,
      null, // Immediate notification
      { type: 'challenge_reminder', challengeName }
    );
  }

  async notifyAIRetrainingComplete(): Promise<void> {
    await this.showLocalNotification(
      '🤖 AI 재학습 완료!',
      '개인 맞춤 AI 모델이 업데이트되었습니다. 새로운 분석을 확인해보세요.',
      { type: 'ai_retrain_complete' }
    );
  }

  async notifyFriendActivity(friendName: string, activity: string): Promise<void> {
    await this.showLocalNotification('👥 친구 활동', `${friendName}님이 ${activity}`, {
      type: 'friend_activity',
      friendName,
    });
  }

  async notifyNewAchievement(achievementName: string): Promise<void> {
    await this.showLocalNotification(
      '🎉 새로운 업적 달성!',
      `"${achievementName}" 업적을 획득했습니다!`,
      { type: 'achievement_unlocked', achievementName }
    );
  }

  async notifyWeeklyReport(): Promise<void> {
    await this.showLocalNotification(
      '📊 주간 리포트 도착!',
      '이번 주 골프 진행 상황을 확인해보세요.',
      { type: 'weekly_report' }
    );
  }

  // Schedule daily workout reminders
  async scheduleDailyWorkoutReminders(): Promise<void> {
    // Schedule for 9 AM every day
    await this.scheduleLocalNotification(
      '⛳ 오늘의 골프 연습',
      'AI 코치가 추천하는 오늘의 훈련을 시작해보세요!',
      null, // Immediate notification
      { type: 'daily_workout' }
    );

    // Schedule for 6 PM every day
    await this.scheduleLocalNotification(
      '🌅 저녁 연습 시간',
      '하루를 마무리하며 스윙 연습 어떠세요?',
      null, // Immediate notification
      { type: 'evening_workout' }
    );
  }

  // Schedule weekly summary
  async scheduleWeeklySummary(): Promise<void> {
    // Every Sunday at 8 PM
    await this.scheduleLocalNotification(
      '📈 주간 성과 요약',
      '이번 주 골프 향상도를 확인하고 다음 주 목표를 설정해보세요.',
      null, // Immediate notification
      { type: 'weekly_summary' }
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;
