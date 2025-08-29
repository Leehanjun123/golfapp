import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Root Stack Navigator Types
export type RootStackParamList = {
  Main: undefined;
  SwingAnalysis: {
    videoUri?: string;
    proGolferId?: string;
  };
  ChallengeDetail: {
    challengeId: string;
  };
  Profile: {
    userId?: string;
  };
  Settings: undefined;
  AICoachSession: {
    sessionId?: string;
    topic?: string;
  };
};

// Bottom Tab Navigator Types
export type MainTabParamList = {
  Home: undefined;
  ProComparison: undefined;
  AICoach: undefined;
  Challenges: undefined;
  Profile: undefined;
};

// Navigation Props Types
export type RootStackNavigationProp<T extends keyof RootStackParamList> = StackNavigationProp<
  RootStackParamList,
  T
>;

export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

export type MainTabNavigationProp<T extends keyof MainTabParamList> = BottomTabNavigationProp<
  MainTabParamList,
  T
>;

export type MainTabRouteProp<T extends keyof MainTabParamList> = RouteProp<MainTabParamList, T>;

// Screen Props Types
export interface ScreenProps<T extends keyof RootStackParamList> {
  navigation: RootStackNavigationProp<T>;
  route: RootStackRouteProp<T>;
}

export interface TabScreenProps<T extends keyof MainTabParamList> {
  navigation: MainTabNavigationProp<T>;
  route: MainTabRouteProp<T>;
}
