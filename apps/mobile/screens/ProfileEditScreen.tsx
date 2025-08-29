import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedButton } from '../components/AnimatedButton';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { API_ENDPOINTS } from '../config/api';

interface ProfileEditScreenProps {
  navigation: any;
  route: any;
}

export default function ProfileEditScreen({ navigation, route }: ProfileEditScreenProps) {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const { profileData } = route.params || {};

  const [formData, setFormData] = useState({
    fullName: profileData?.profile?.name || user?.full_name || '',
    handicap: profileData?.stats?.handicap?.toString() || '',
    averageScore: profileData?.stats?.averageScore?.toString() || '',
    driveDistance: profileData?.stats?.driveDistance?.toString() || '',
    bio: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.profile, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: formData.fullName,
          handicap: parseFloat(formData.handicap) || 0,
          average_score: parseFloat(formData.averageScore) || 0,
          drive_distance: parseFloat(formData.driveDistance) || 0,
          bio: formData.bio,
        }),
      });

      if (response.ok) {
        Alert.alert('성공', '프로필이 업데이트되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error('프로필 업데이트 실패');
      }
    } catch (error) {
      Alert.alert('오류', '프로필 업데이트에 실패했습니다.');
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>프로필 편집</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>기본 정보</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>이름</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={formData.fullName}
              onChangeText={(value) => updateField('fullName', value)}
              placeholder="이름을 입력하세요"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>자기소개</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={formData.bio}
              onChangeText={(value) => updateField('bio', value)}
              placeholder="간단한 자기소개를 작성해주세요"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>골프 통계</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>핸디캡</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={formData.handicap}
              onChangeText={(value) => updateField('handicap', value)}
              placeholder="예: 15"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>평균 스코어</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={formData.averageScore}
              onChangeText={(value) => updateField('averageScore', value)}
              placeholder="예: 87"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              드라이버 거리 (야드)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={formData.driveDistance}
              onChangeText={(value) => updateField('driveDistance', value)}
              placeholder="예: 250"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {loading ? (
          <LoadingAnimation size="medium" text="저장 중..." />
        ) : (
          <View style={styles.buttons}>
            <AnimatedButton
              title="저장"
              onPress={handleSave}
              variant="primary"
              size="large"
              style={styles.saveButton}
            />
            <AnimatedButton
              title="취소"
              onPress={() => navigation.goBack()}
              variant="secondary"
              size="large"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  buttons: {
    marginTop: 20,
    marginBottom: 40,
  },
  saveButton: {
    marginBottom: 12,
  },
});
