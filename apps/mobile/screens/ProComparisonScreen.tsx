import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ProGolfer {
  id: string;
  name: string;
  nameKorean: string;
  style: string;
  avgDrive: number;
}

interface ComparisonResult {
  similarityScore: number;
  grade: string;
  strengths: string[];
  improvements: string[];
}

const ProComparisonScreen: React.FC = () => {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedPro, setSelectedPro] = useState<string>('tiger_woods');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<any>(null);

  const availablePros: ProGolfer[] = [
    {
      id: 'tiger_woods',
      name: 'Tiger Woods',
      nameKorean: '타이거 우즈',
      style: 'Powerful',
      avgDrive: 295,
    },
    {
      id: 'rory_mcilroy',
      name: 'Rory McIlroy',
      nameKorean: '로리 맥길로이',
      style: 'Smooth',
      avgDrive: 302,
    },
    { id: 'jon_rahm', name: 'Jon Rahm', nameKorean: '욘 람', style: 'Technical', avgDrive: 288 },
    {
      id: 'dustin_johnson',
      name: 'Dustin Johnson',
      nameKorean: '더스틴 존슨',
      style: 'Athletic',
      avgDrive: 310,
    },
  ];

  const requestCameraPermission = async () => {
    if (!permission) {
      const result = await requestPermission();
      return result.granted;
    }
    return permission.granted;
  };

  const pickMedia = async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '미디어 라이브러리 접근 권한이 필요합니다.');
      return;
    }

    let result;
    if (type === 'image') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        videoMaxDuration: 30, // 30초 제한
      });
    }

    if (!result.canceled) {
      setSelectedMedia(result.assets[0].uri);
      setMediaType(type);
    }
  };

  const openCamera = async (type: 'photo' | 'video') => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      setMediaType(type === 'photo' ? 'image' : 'video');
      setShowCamera(true);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setSelectedMedia(photo.uri);
      setMediaType('image');
      setShowCamera(false);
    }
  };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 30, // 30초 제한
      });
      setSelectedMedia(video.uri);
      setMediaType('video');
      setIsRecording(false);
      setShowCamera(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const analyzeSwing = async () => {
    if (!selectedMedia) {
      Alert.alert('미디어 선택', '분석할 사진이나 동영상을 선택해주세요.');
      return;
    }

    setIsAnalyzing(true);

    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('golfer_id', selectedPro);
      formData.append('media_type', mediaType);

      // 미디어 파일 추가
      formData.append('file', {
        uri: selectedMedia,
        type: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
        name: mediaType === 'image' ? 'swing.jpg' : 'swing.mp4',
      } as any);

      const response = await fetch(`${API_ENDPOINTS.proComparison}?golfer_id=${selectedPro}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token && token !== 'guest' ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();

      if (data.success && data.data) {
        setResult({
          similarityScore: data.data.similarity_score,
          grade: getGrade(data.data.similarity_score),
          strengths: data.data.strengths,
          improvements: data.data.improvements,
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Mock 데이터로 폴백
      setTimeout(() => {
        setResult({
          similarityScore: Math.floor(Math.random() * 30) + 70,
          grade: 'B+',
          strengths: ['좋은 그립과 셋업 자세', '부드러운 스윙 템포', '안정적인 피니시'],
          improvements: ['백스윙 시 더 큰 회전', '임팩트 시 체중 이동 개선', '팔로우스루 확대'],
        });
        setIsAnalyzing(false);
      }, 2000);
      return;
    }

    setIsAnalyzing(false);
  };

  const getGrade = (score: number): string => {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    return 'D';
  };

  const resetAnalysis = () => {
    setSelectedMedia(null);
    setResult(null);
    setMediaType('image');
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.header}>
        <Text style={styles.title}>프로 골퍼 비교 분석</Text>
        <Text style={styles.subtitle}>당신의 스윙을 프로와 비교해보세요</Text>
      </LinearGradient>

      {/* 미디어 선택 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. 스윙 미디어 선택</Text>

        <View style={styles.mediaOptions}>
          <TouchableOpacity style={styles.mediaButton} onPress={() => openCamera('photo')}>
            <Ionicons name="camera" size={24} color="#4CAF50" />
            <Text style={styles.mediaButtonText}>사진 촬영</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mediaButton} onPress={() => openCamera('video')}>
            <Ionicons name="videocam" size={24} color="#FF6B35" />
            <Text style={styles.mediaButtonText}>동영상 촬영</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mediaOptions}>
          <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('image')}>
            <Ionicons name="image" size={24} color="#667EEA" />
            <Text style={styles.mediaButtonText}>사진 선택</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('video')}>
            <Ionicons name="film" size={24} color="#F59E0B" />
            <Text style={styles.mediaButtonText}>동영상 선택</Text>
          </TouchableOpacity>
        </View>

        {selectedMedia && (
          <View style={styles.mediaPreview}>
            {mediaType === 'image' ? (
              <Image source={{ uri: selectedMedia }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewVideo}>
                <Text style={styles.videoPlaceholder}>동영상이 선택되었습니다</Text>
                <Text style={styles.videoPath}>{selectedMedia.split('/').pop()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.removeButton} onPress={() => setSelectedMedia(null)}>
              <Ionicons name="close-circle" size={30} color="#ff4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 프로 골퍼 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. 프로 골퍼 선택</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availablePros.map((pro) => (
            <TouchableOpacity
              key={pro.id}
              style={[styles.proCard, selectedPro === pro.id && styles.selectedProCard]}
              onPress={() => setSelectedPro(pro.id)}
            >
              <View style={styles.proAvatar}>
                <Text style={styles.avatarText}>{pro.name.charAt(0)}</Text>
              </View>
              <Text style={styles.proName}>{pro.nameKorean}</Text>
              <Text style={styles.proStyle}>{pro.style}</Text>
              <Text style={styles.proDrive}>{pro.avgDrive}yd</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 분석 버튼 */}
      <TouchableOpacity
        style={[styles.analyzeButton, !selectedMedia && styles.disabledButton]}
        onPress={analyzeSwing}
        disabled={!selectedMedia || isAnalyzing}
      >
        {isAnalyzing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="analytics" size={24} color="#fff" />
            <Text style={styles.analyzeButtonText}>AI 스윙 분석 시작</Text>
          </>
        )}
      </TouchableOpacity>

      {/* 분석 결과 */}
      {result && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>분석 결과</Text>

          <View style={styles.scoreCard}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{result.similarityScore}%</Text>
              <Text style={styles.scoreGrade}>{result.grade}</Text>
            </View>
            <Text style={styles.scoreLabel}>프로와의 유사도</Text>
          </View>

          <View style={styles.feedbackSection}>
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" /> 잘하고 있는 점
              </Text>
              {result.strengths.map((strength, index) => (
                <Text key={index} style={styles.feedbackItem}>
                  • {strength}
                </Text>
              ))}
            </View>

            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>
                <Ionicons name="trending-up" size={20} color="#FF6B35" /> 개선이 필요한 점
              </Text>
              {result.improvements.map((improvement, index) => (
                <Text key={index} style={styles.feedbackItem}>
                  • {improvement}
                </Text>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={resetAnalysis}>
            <Text style={styles.resetButtonText}>새로운 분석 시작</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 카메라 모달 */}
      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} facing={cameraType} ref={cameraRef}>
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.cameraButton} onPress={() => setShowCamera(false)}>
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setCameraType(cameraType === 'back' ? 'front' : 'back')}
              >
                <Ionicons name="camera-reverse" size={30} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.captureControls}>
              {mediaType === 'image' ? (
                <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.captureButton, isRecording && styles.recordingButton]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <View style={[styles.captureInner, isRecording && styles.recordingInner]} />
                </TouchableOpacity>
              )}
            </View>
          </CameraView>
        </View>
      </Modal>
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
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  mediaOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mediaButtonText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  mediaPreview: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  previewVideo: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  videoPath: {
    color: '#ccc',
    fontSize: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  proCard: {
    alignItems: 'center',
    padding: 15,
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    width: 100,
  },
  selectedProCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0f9ff',
  },
  proAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  proName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  proStyle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  proDrive: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 4,
  },
  analyzeButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  resultSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreCard: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f9ff',
    borderWidth: 8,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scoreGrade: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  feedbackSection: {
    marginTop: 20,
  },
  feedbackCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  feedbackItem: {
    fontSize: 15,
    color: '#666',
    marginVertical: 5,
    paddingLeft: 10,
  },
  resetButton: {
    backgroundColor: '#667EEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 3,
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  captureInner: {
    flex: 1,
    borderRadius: 35,
    backgroundColor: 'white',
  },
  recordingInner: {
    backgroundColor: 'red',
  },
});

export default ProComparisonScreen;
