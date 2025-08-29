import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import contexts
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';

// Import screens
import HomeScreen from './screens/HomeScreen';
import ProComparisonScreen from './screens/ProComparisonScreen';
import AICoachScreen from './screens/AICoachScreen';
import AIChatScreen from './screens/AIChatScreen';  // 새로운 AI 채팅 화면
import ChallengesScreen from './screens/ChallengesScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import SwingAnalysisScreen from './screens/SwingAnalysisScreen';
import ProfileEditScreen from './screens/ProfileEditScreen';
import VideoAnalysisScreen from './screens/VideoAnalysisScreen';
import PersonalAIScreen from './screens/PersonalAIScreen';
import StatsScreen from './screens/StatsScreen';
import TrainingPlanScreen from './screens/TrainingPlanScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SearchScreen from './screens/SearchScreen';
import SwingComparisonScreen from './screens/SwingComparisonScreen';
import GoalSettingScreen from './screens/GoalSettingScreen';
import ChatScreen from './screens/ChatScreen';
import LiveChallengeScreen from './screens/LiveChallengeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AuthStack() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {authMode === 'login' ? (
        <Stack.Screen name="Login">
          {() => <LoginScreen onLogin={login} onSignupPress={() => setAuthMode('signup')} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Signup">
          {() => (
            <SignupScreen
              onSignupSuccess={() => setAuthMode('login')}
              onLoginPress={() => setAuthMode('login')}
            />
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}

function MainStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="SwingAnalysis"
        component={SwingAnalysisScreen}
        options={{
          headerShown: true,
          headerTitle: 'AI 스윙 분석',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="VideoAnalysis"
        component={VideoAnalysisScreen}
        options={{
          headerShown: true,
          headerTitle: '비디오 스윙 분석',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="PersonalAI"
        component={PersonalAIScreen}
        options={{
          headerShown: true,
          headerTitle: '개인 맞춤 AI',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          headerShown: true,
          headerTitle: '상세 통계',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="TrainingPlan"
        component={TrainingPlanScreen}
        options={{
          headerShown: true,
          headerTitle: 'AI 훈련 계획',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          headerShown: true,
          headerTitle: '리더보드',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: '설정',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          headerShown: true,
          headerTitle: '검색',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="SwingComparison"
        component={SwingComparisonScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="GoalSetting"
        component={GoalSettingScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="LiveChallenge"
        component={LiveChallengeScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const { theme, isDark } = useTheme();
  const { logout } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Pro Compare') {
            iconName = focused ? 'golf' : 'golf-outline';
          } else if (route.name === 'AI Coach') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Challenges') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'alert-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Pro Compare" component={ProComparisonScreen} />
      <Tab.Screen name="AI Coach" component={AIChatScreen} />
      <Tab.Screen name="Challenges" component={ChallengesScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerRight: () => (
            <Ionicons
              name="log-out-outline"
              size={24}
              color="#fff"
              style={{ marginRight: 16 }}
              onPress={logout}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { theme, isDark } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(onboardingStatus === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasSeenOnboarding(false);
    }
  };

  const handleOnboardingComplete = () => {
    setHasSeenOnboarding(true);
  };

  if (loading || hasSeenOnboarding === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show onboarding for new users
  if (!hasSeenOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <OfflineProvider>
            <AppContent />
          </OfflineProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
