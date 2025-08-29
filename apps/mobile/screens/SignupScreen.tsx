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
import { API_ENDPOINTS } from '../config/api';

interface SignupScreenProps {
  onSignupSuccess: () => void;
  onLoginPress: () => void;
}

export default function SignupScreen({ onSignupSuccess, onLoginPress }: SignupScreenProps) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const { email, username, password, confirmPassword, fullName } = formData;

    if (!email || !username || !password || !fullName) {
      Alert.alert('오류', '모든 필수 항목을 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('오류', '비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.auth}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          password,
          name: fullName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('가입 완료', '회원가입이 완료되었습니다. 로그인해주세요.', [
          { text: '확인', onPress: onSignupSuccess },
        ]);
      } else {
        Alert.alert('가입 실패', data.error || '이미 사용 중인 이메일입니다.');
      }
    } catch (error) {
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>회원가입</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Golf AI Coach와 함께 시작하세요
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>이름 *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="홍길동"
              placeholderTextColor={theme.colors.textSecondary}
              value={formData.fullName}
              onChangeText={(value) => updateField('fullName', value)}
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>사용자명 *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="golfer123"
              placeholderTextColor={theme.colors.textSecondary}
              value={formData.username}
              onChangeText={(value) => updateField('username', value)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>이메일 *</Text>
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
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>비밀번호 * (6자 이상)</Text>
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
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>비밀번호 확인 *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="비밀번호 다시 입력"
              placeholderTextColor={theme.colors.textSecondary}
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {loading ? (
            <LoadingAnimation size="medium" text="가입 처리 중..." />
          ) : (
            <>
              <AnimatedButton
                title="가입하기"
                onPress={handleSignup}
                variant="primary"
                size="large"
                style={styles.signupButton}
              />

              <TouchableOpacity onPress={onLoginPress} style={styles.loginContainer}>
                <Text style={[styles.loginText, { color: theme.colors.textSecondary }]}>
                  이미 계정이 있으신가요?{' '}
                </Text>
                <Text style={[styles.loginLink, { color: theme.colors.primary }]}>로그인</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.terms}>
          <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
            가입하시면 Golf AI Coach의 <Text style={{ color: theme.colors.primary }}>이용약관</Text>{' '}
            및 <Text style={{ color: theme.colors.primary }}>개인정보 처리방침</Text>에 동의하는
            것으로 간주됩니다.
          </Text>
        </View>
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
    marginBottom: 30,
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
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
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
  signupButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  terms: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
