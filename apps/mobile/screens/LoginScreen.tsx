import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatedButton } from '../components/AnimatedButton';
import { LoadingAnimation } from '../components/LoadingAnimation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

interface LoginScreenProps {
  onLogin: (token: string, user: any) => void;
  onSignupPress: () => void;
}

export default function LoginScreen({ onLogin, onSignupPress }: LoginScreenProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.auth}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const token = data.data.token;
        const user = data.data.user;
        
        await AsyncStorage.setItem('access_token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        onLogin(token, user);
      } else {
        Alert.alert('로그인 실패', data.error || '이메일 또는 비밀번호를 확인해주세요.');
      }
    } catch (error) {
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.logo, { color: theme.colors.primary }]}>🏌️</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>Golf AI Coach</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            AI로 완벽한 스윙을 만들어보세요
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>이메일</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="email@example.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>비밀번호</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="비밀번호 입력"
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {loading ? (
            <LoadingAnimation size="medium" text="로그인 중..." />
          ) : (
            <>
              <AnimatedButton
                title="로그인"
                onPress={handleLogin}
                variant="primary"
                size="large"
                style={styles.loginButton}
              />

              <TouchableOpacity onPress={onSignupPress} style={styles.signupContainer}>
                <Text style={[styles.signupText, { color: theme.colors.textSecondary }]}>
                  아직 계정이 없으신가요?{' '}
                </Text>
                <Text style={[styles.signupLink, { color: theme.colors.primary }]}>회원가입</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>또는</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        <TouchableOpacity
          style={[styles.guestButton, { borderColor: theme.colors.border }]}
          onPress={() => onLogin('guest', { username: 'Guest', email: 'guest@example.com' })}
        >
          <Text style={[styles.guestButtonText, { color: theme.colors.text }]}>
            게스트로 둘러보기
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  loginButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  guestButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
