// Notification service temporarily disabled for Expo Go compatibility
// Will be re-enabled for production builds

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
}

class NotificationService {
  private expoPushToken: string | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    console.log('Push notifications disabled in Expo Go');
    return null;
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: any,
    data?: any
  ): Promise<string> {
    console.log('Local notification:', { title, body, data });
    return 'mock-notification-id';
  }

  async showLocalNotification(title: string, body: string, data?: any): Promise<void> {
    console.log('Show notification:', { title, body, data });
  }

  async cancelNotification(notificationId: string): Promise<void> {
    console.log('Cancel notification:', notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    console.log('Cancel all notifications');
  }

  async getScheduledNotifications(): Promise<any[]> {
    return [];
  }

  addNotificationReceivedListener(callback: (notification: any) => void): any {
    return { remove: () => {} };
  }

  addNotificationResponseReceivedListener(callback: (response: any) => void): any {
    return { remove: () => {} };
  }

  async scheduleWorkoutReminder(timeInSeconds: number): Promise<string> {
    return 'mock-workout-reminder';
  }

  async scheduleChallengeReminder(challengeName: string, hoursLeft: number): Promise<string> {
    return 'mock-challenge-reminder';
  }

  async notifyAIRetrainingComplete(): Promise<void> {
    console.log('AI retraining complete notification');
  }

  async notifyFriendActivity(friendName: string, activity: string): Promise<void> {
    console.log('Friend activity notification:', { friendName, activity });
  }

  async notifyNewAchievement(achievementName: string): Promise<void> {
    console.log('Achievement notification:', achievementName);
  }

  async notifyWeeklyReport(): Promise<void> {
    console.log('Weekly report notification');
  }

  async scheduleDailyWorkoutReminders(): Promise<void> {
    console.log('Daily workout reminders scheduled');
  }

  async scheduleWeeklySummary(): Promise<void> {
    console.log('Weekly summary scheduled');
  }
}

export const notificationService = new NotificationService();
export default notificationService;