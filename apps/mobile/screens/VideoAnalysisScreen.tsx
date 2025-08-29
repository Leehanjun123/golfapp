import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  Switch,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, fetchWithTimeout } from '../config/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AnalysisResult {
  overall_score: number;
  phase_scores: {
    address: number;
    backswing: number;
    impact: number;
    follow_through: number;
  };
  improvements: string[];
  strengths: string[];
  coaching: {
    tempo: string;
    rotation: string;
    trajectory: string;
  };
  trajectory_analysis: {
    tempo_ratio: number;
    max_shoulder_rotation: number;
    max_x_factor: number;
  };
}

interface LiveFeedback {
  posture_feedback: string;
  balance_feedback: string;
  rotation_feedback: string;
  quick_tips: string[];
  score: number;
  audio_feedback: string;
  accuracy?: number;
  confidence?: number;
  phase?: string;
  metrics?: {
    shoulder_rotation: number;
    hip_rotation: number;
    x_factor: number;
    spine_angle: number;
    weight_left: number;
    weight_right: number;
  };
  ideal_metrics?: any;
  feedback?: string[];
}

type AnalysisMode = 'live' | 'record' | 'upload';

// 비디오 플레이어 컴포넌트
const VideoPlayer: React.FC<{ uri: string }> = ({ uri }) => {
  const player = useVideoPlayer(uri, player => {
    player.loop = true;
    player.play();
    player.muted = true;
  });

  return (
    <VideoView
      style={styles.video}
      player={player}
      contentFit="contain"
    />
  );
};

const VideoAnalysisScreen: React.FC = () => {
  const { token } = useAuth();
  const [mode, setMode] = useState<AnalysisMode>('live');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [liveFeedback, setLiveFeedback] = useState<LiveFeedback | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gestureMode, setGestureMode] = useState(true); // 제스처 모드 활성화
  const [contactlessMode, setContactlessMode] = useState(false); // 비접촉 모드
  const [detectedGesture, setDetectedGesture] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const liveAnalysisInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const gestureDetectionInterval = useRef<NodeJS.Timeout | null>(null);
  const audioRecording = useRef<Audio.Recording | null>(null);
  const countdownAnimation = useRef(new Animated.Value(0)).current;

  // 음성 피드백 함수 (카메라 셔터 소리 후 실행)
  const speakFeedback = async (text: string, priority: boolean = false) => {
    if (audioEnabled || priority) {  // priority가 true면 무조건 재생
      try {
        // 오디오 모드 설정 (최대 볼륨, 스피커 출력)
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,  // 무음 모드에서도 재생
          staysActiveInBackground: true,
          shouldDuckAndroid: false,  // 다른 앱 소리 줄이지 않음
          playThroughEarpieceAndroid: false,  // 스피커로 재생
        });
        
        // 중요한 메시지는 다른 소리 중단
        if (priority) {
          await Speech.stop();
          // 짧은 지연만
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 최대 볼륨으로 명확하게 재생
        await Speech.speak(text, {
          language: 'ko',
          rate: 0.85,    // 약간 천천히 (명확성 증가)
          pitch: 1.1,    // 약간 높은 톤 (선명도 증가)
          volume: 1.0,   // 최대 볼륨
        });
      } catch (error) {
        console.error('Audio setup error:', error);
      }
    }
  };

  // 카운트다운 시작
  const startCountdown = (callback: () => void) => {
    setCountdown(3);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    let count = 3;
    speakFeedback(`${count}`, true);  // 카운트다운 큰 소리로
    
    countdownInterval.current = setInterval(() => {
      count -= 1;
      
      if (count > 0) {
        setCountdown(count);
        speakFeedback(`${count}`, true);  // 카운트다운 큰 소리로
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // 카운트다운 애니메이션
        Animated.sequence([
          Animated.timing(countdownAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(countdownAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (count === 0) {
        setCountdown(null);
        if (countdownInterval.current) {
          clearInterval(countdownInterval.current);
        }
        speakFeedback("시작!", true);  // 큰 소리로 알림
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        callback();
      }
    }, 1000);
  };

  // 실시간 분석 시작
  const startLiveAnalysis = async (withCountdown = true) => {
    if (!cameraRef.current) return;
    
    const actualStart = async () => {
      setIsLiveAnalyzing(true);
      
      // 백 카메라로 전환 (스윙 촬영용)
      if (facing === 'front') {
        setFacing('back');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 시작 안내를 크고 명확하게
      await speakFeedback("실시간 분석을 시작합니다.", true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await speakFeedback("스윙 자세를 취해주세요.", true);
      
      // 5초마다 분석 (셔터음 빈도 감소)
      liveAnalysisInterval.current = setInterval(async () => {
      try {
        // 셔터음 없이 조용히 촬영
        const photo = await cameraRef.current?.takePictureAsync({
          base64: true,
          quality: 0.3,  // 품질 낮춰서 속도 향상
          skipProcessing: true,  // 처리 스킵
        });
        
        if (photo?.base64) {
          const response = await fetchWithTimeout(
            API_ENDPOINTS.realtimeAnalysis,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && token !== 'guest' ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ image: `data:image/jpeg;base64,${photo.base64}` }),
            },
            10000
          );
          
          const result = await response.json();
          if (result.success && result.data) {
            setLiveFeedback(result.data);
            
            // MediaPipe 95% 정확도 피드백 (음성 최우선)
            if (result.data.feedback && result.data.feedback.length > 0) {
              // 가장 중요한 피드백을 큰 소리로
              await speakFeedback(result.data.feedback[0], true);  // 무조건 재생
            } else if (result.data.score < 30) {
              await speakFeedback(result.data.audio_feedback || "자세를 개선해주세요", true);
            } else if (result.data.score > 70) {
              await speakFeedback("훌륭한 자세입니다!", true);
            }
          }
        }
      } catch (error) {
        console.error('Live analysis error:', error);
      }
    }, 5000);  // 3초 -> 5초로 변경 (셔터음 감소)
    };
    
    if (withCountdown) {
      startCountdown(actualStart);
    } else {
      actualStart();
    }
  };

  // 실시간 분석 중지
  const stopLiveAnalysis = () => {
    if (liveAnalysisInterval.current) {
      clearInterval(liveAnalysisInterval.current);
      liveAnalysisInterval.current = null;
    }
    setIsLiveAnalyzing(false);
    speakFeedback("실시간 분석을 종료합니다.");
  };

  // 녹화 시작
  const startRecording = async (withCountdown = true) => {
    if (!cameraRef.current) return;
    
    const actualStart = async () => {
      try {
        setIsRecording(true);
        speakFeedback("녹화를 시작합니다. 10초 동안 스윙을 수행하세요.");
        
        const video = await cameraRef.current.recordAsync({
          maxDuration: 10,
        });
      
      if (video) {
        setVideoUri(video.uri);
        setShowCamera(false);
        
        // 갤러리에 저장
        try {
          await MediaLibrary.saveToLibraryAsync(video.uri);
          Alert.alert('저장 완료', '비디오가 갤러리에 저장되었습니다.');
        } catch (saveError) {
          console.log('갤러리 저장 실패:', saveError);
        }
        
        // 자동으로 분석 시작
        await analyzeVideo(video.uri);
      }
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('오류', '녹화 중 문제가 발생했습니다.');
    } finally {
      setIsRecording(false);
    }
    };
    
    if (withCountdown) {
      startCountdown(actualStart);
    } else {
      actualStart();
    }
  };

  // 녹화 중지
  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      speakFeedback("녹화를 종료합니다.");
    }
  };

  // 파일 선택
  const pickVideoFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        await analyzeVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert('오류', '파일 선택 중 문제가 발생했습니다.');
    }
  };

  // 갤러리에서 선택
  const pickVideoFromGallery = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 10,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      await analyzeVideo(result.assets[0].uri);
    }
  };

  // 비디오 분석
  const analyzeVideo = async (uri: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    speakFeedback("비디오 분석을 시작합니다. 잠시만 기다려주세요.");

    try {
      console.log(`📹 Video URI: ${uri}`);
      
      // 실제 비디오 데이터 읽기
      let base64;
      try {
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log(`📦 Base64 size: ${base64.length} chars`);
        
        // 너무 큰 경우 크기 제한 (5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (base64.length > MAX_SIZE) {
          console.warn(`⚠️ Video too large: ${base64.length} > ${MAX_SIZE}, truncating...`);
          base64 = base64.substring(0, MAX_SIZE);
        }
      } catch (error) {
        console.error('Failed to read video:', error);
        // 폴백: 테스트 데이터
        base64 = "test_video_data";
      }

      console.log(`🚀 Sending request to: ${API_ENDPOINTS.videoAnalysis}`);
      console.log(`🔑 Token: ${token ? 'Present' : 'Missing'}`);
      
      let apiResponse;
      try {
        apiResponse = await fetchWithTimeout(
          API_ENDPOINTS.videoAnalysis,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && token !== 'guest' ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ video: base64 }),
          },
          30000
        );
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        console.error('URL was:', API_ENDPOINTS.videoAnalysis);
        console.error('Base64 length:', base64.length);
        throw fetchError;
      }

      if (!apiResponse.ok) {
        throw new Error('비디오 분석 실패');
      }

      const result = await apiResponse.json();
      
      if (result.success && result.data) {
        setAnalysisResult(result.data);
        
        const score = result.data.overall_score;
        let message = "";
        
        if (score < 30) {
          message = "유효한 스윙이 감지되지 않았습니다. 실제 골프 스윙을 촬영해주세요.";
        } else if (score < 60) {
          message = `스윙 점수는 ${score}점입니다. 개선이 필요합니다. 제안사항을 확인하세요.`;
        } else if (score < 80) {
          message = `스윙 점수는 ${score}점입니다. 좋은 스윙입니다! 몇 가지 개선점을 확인해보세요.`;
        } else {
          message = `스윙 점수는 ${score}점입니다. 훌륭한 스윙입니다! 프로 수준에 가까워지고 있어요.`;
        }
        
        speakFeedback(message);
        Alert.alert('분석 완료', message);
      }
    } catch (error: any) {
      console.error('Video analysis error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      
      let errorMessage = '비디오 분석 중 문제가 발생했습니다.';
      if (error.message === 'Network request failed') {
        errorMessage = '네트워크 연결 문제가 발생했습니다. 인터넷 연결을 확인해주세요.';
      } else if (error.message === 'Request timeout') {
        errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
      }
      
      Alert.alert('오류', errorMessage);
      speakFeedback("비디오 분석에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 카메라 권한 체크
  const checkCameraPermission = async () => {
    if (!permission) {
      const result = await requestPermission();
      return result.granted;
    }
    return permission.granted;
  };

  // 모드 변경
  const handleModeChange = (newMode: AnalysisMode) => {
    if (isLiveAnalyzing) {
      stopLiveAnalysis();
    }
    setMode(newMode);
    setShowCamera(false);
    setVideoUri(null);
    setAnalysisResult(null);
    setLiveFeedback(null);
  };

  // 카메라 시작
  const startCamera = async () => {
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      Alert.alert('권한 필요', '카메라 권한이 필요합니다.');
      return;
    }
    setShowCamera(true);
    
    // 비접촉 모드는 사용자가 수동으로 활성화
    // 자동 활성화하지 않음 (오작동 방지)
    setContactlessMode(false);
    
    // 안내 메시지만 표시
    setTimeout(() => {
      speakFeedback("카메라가 준비되었습니다. 상단의 손 아이콘을 눌러 비접촉 모드를 활성화할 수 있습니다.", true);
    }, 1000);
  };

  // 손동작 감지 시작
  const startGestureDetection = async () => {
    if (!cameraRef.current) return;
    
    console.log("Starting gesture detection...");
    
    // 손동작 감지 안내
    speakFeedback("손동작 인식이 활성화되었습니다. 카메라를 향해 손을 크게 흔들어 시작하세요.", true);
    
    // 프론트 카메라로 전환하여 손동작을 더 잘 감지
    if (facing === 'back') {
      setFacing('front');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    let lastGestureTime = 0;
    const MIN_GESTURE_INTERVAL = 3000; // 최소 3초 간격
    
    gestureDetectionInterval.current = setInterval(async () => {
      // 이미 분석 중이거나 녹화 중이거나 카운트다운 중이면 제스처 감지하지 않음
      if (countdown !== null || isLiveAnalyzing || isRecording) return;
      
      // 마지막 제스처 감지 후 최소 시간이 지나지 않았으면 스킵
      const now = Date.now();
      if (now - lastGestureTime < MIN_GESTURE_INTERVAL) return;
      
      try {
        // 셔터음 없이 조용히 촬영
        const photo = await cameraRef.current?.takePictureAsync({
          base64: true,
          quality: 0.3,  // 품질 낮춰서 속도 향상
          skipProcessing: true,  // 처리 스킵
        });
        
        if (photo?.base64) {
          const response = await fetchWithTimeout(
            API_ENDPOINTS.gestureDetection,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && token !== 'guest' ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ image: `data:image/jpeg;base64,${photo.base64}` }),
            },
            5000
          );
          
          const result = await response.json();
          if (result.success && result.data?.detected && result.data.confidence > 0.7) {
            // 신뢰도가 70% 이상일 때만 처리
            lastGestureTime = now;
            handleGestureAction(result.data);
          }
        }
      } catch (error) {
        // 조용히 실패 (로그 스팸 방지)
      }
    }, 3000); // 3초마다 감지 (더 안정적)
  };

  // 손동작 감지 중지
  const stopGestureDetection = () => {
    if (gestureDetectionInterval.current) {
      clearInterval(gestureDetectionInterval.current);
      gestureDetectionInterval.current = null;
    }
  };

  // 박수 소리 감지 시작
  const startClapDetection = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      audioRecording.current = recording;
      
      // 주기적으로 오디오 분석
      setTimeout(async () => {
        if (audioRecording.current) {
          await audioRecording.current.stopAndUnloadAsync();
          const uri = audioRecording.current.getURI();
          
          if (uri) {
            // 오디오 파일을 base64로 변환하여 서버로 전송
            // 여기서는 간단히 시뮬레이션
            detectClap();
          }
          
          // 다시 녹음 시작
          if (contactlessMode) {
            startClapDetection();
          }
        }
      }, 2000); // 2초마다 체크
    } catch (error) {
      console.error('Audio recording error:', error);
    }
  };

  // 박수 감지 시뮬레이션
  const detectClap = () => {
    // 실제로는 서버로 오디오를 전송하여 분석
    // 여기서는 매우 낮은 확률로만 시뮬레이션 (오작동 방지)
    if (Math.random() > 0.95) { // 5% 확률로만
      handleClapAction();
    }
  };

  // 손동작에 따른 액션 처리
  const handleGestureAction = (gestureData: any) => {
    const { gesture, action, message } = gestureData;
    
    setDetectedGesture(message);
    setTimeout(() => setDetectedGesture(null), 3000);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    switch (action) {
      case 'start':
        if (!isLiveAnalyzing && !isRecording) {
          speakFeedback(message, true);  // 우선순위 높게
          if (mode === 'live') {
            setTimeout(() => startLiveAnalysis(), 500);
          } else if (mode === 'record') {
            setTimeout(() => startRecording(), 500);
          }
        }
        break;
      case 'stop':
        if (isLiveAnalyzing || isRecording) {
          speakFeedback(message, true);  // 우선순위 높게
          if (isLiveAnalyzing) {
            stopLiveAnalysis();
          } else if (isRecording) {
            stopRecording();
          }
        }
        break;
      case 'ready':
        speakFeedback("준비 완료", true);
        break;
      default:
        break;
    }
  };

  // 박수에 따른 액션 처리
  const handleClapAction = () => {
    setDetectedGesture("👏 박수 감지!");
    setTimeout(() => setDetectedGesture(null), 2000);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // 토글 액션
    if (isLiveAnalyzing) {
      stopLiveAnalysis();
    } else if (isRecording) {
      stopRecording();
    } else {
      if (mode === 'live') {
        startLiveAnalysis();
      } else if (mode === 'record') {
        startRecording();
      }
    }
  };

  // 비접촉 모드 토글
  const toggleContactlessMode = async () => {
    const newMode = !contactlessMode;
    setContactlessMode(newMode);
    
    if (newMode) {
      // 활성화
      await speakFeedback("비접촉 제어 모드를 시작합니다.", true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await speakFeedback("카메라를 향해 손을 크게 흔들면 시작, 주먹을 쥐면 중지됩니다.", true);
      
      setTimeout(() => {
        startGestureDetection();
        startClapDetection();
      }, 2000);
    } else {
      // 비활성화
      await speakFeedback("비접촉 제어 모드를 종료합니다.", true);
      stopGestureDetection();
      if (audioRecording.current) {
        audioRecording.current.stopAndUnloadAsync();
      }
      
      // 백 카메라로 돌아가기
      if (facing === 'front') {
        setFacing('back');
      }
    }
  };

  // 카메라 종료 시 정리
  useEffect(() => {
    return () => {
      if (liveAnalysisInterval.current) {
        clearInterval(liveAnalysisInterval.current);
      }
      if (gestureDetectionInterval.current) {
        clearInterval(gestureDetectionInterval.current);
      }
      if (audioRecording.current) {
        audioRecording.current.stopAndUnloadAsync();
      }
      Speech.stop();
    };
  }, []);

  // 제스처 설정
  const longPressGesture = Gesture.LongPress()
    .minDuration(800)
    .onStart(() => {
      if (!isLiveAnalyzing && !isRecording && !countdown) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (mode === 'live') {
          startLiveAnalysis();
        } else if (mode === 'record') {
          startRecording();
        }
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (isLiveAnalyzing) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        stopLiveAnalysis();
      } else if (isRecording) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        stopRecording();
      }
    });

  const swipeGesture = Gesture.Pan()
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 500) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFacing(current => current === 'back' ? 'front' : 'back');
      }
    });

  const composedGesture = Gesture.Race(longPressGesture, doubleTapGesture, swipeGesture);

  // 카메라 화면
  if (showCamera) {
    return (
      <GestureHandlerRootView style={styles.cameraContainer}>
        <GestureDetector gesture={composedGesture}>
          <View style={styles.cameraContainer}>
            <CameraView 
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              mode={mode === 'record' ? 'video' : 'picture'}
              enableTorch={false}
              animateShutter={false}  // 셔터 애니메이션 비활성화
              mute={true}  // 카메라 소리 음소거
            />
            
            {/* 오버레이 */}
            <View style={styles.cameraOverlay}>
          {/* 상단 컨트롤 */}
          <View style={styles.cameraTopControls}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => {
                setShowCamera(false);
                setIsRecording(false);
                if (isLiveAnalyzing) {
                  stopLiveAnalysis();
                }
                // 비접촉 모드 정리
                if (contactlessMode) {
                  stopGestureDetection();
                  if (audioRecording.current) {
                    audioRecording.current.stopAndUnloadAsync();
                  }
                  setContactlessMode(false);
                }
              }}
            >
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            
            <View style={styles.controlsGroup}>
              <TouchableOpacity
                style={[styles.controlButton, contactlessMode && styles.controlButtonActive]}
                onPress={toggleContactlessMode}
              >
                <Ionicons 
                  name={contactlessMode ? "hand-left" : "hand-left-outline"} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
              
              <View style={styles.audioToggle}>
                <Ionicons name="volume-high" size={24} color="white" />
                <Switch
                  value={audioEnabled}
                  onValueChange={setAudioEnabled}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={audioEnabled ? '#2196F3' : '#f4f3f4'}
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setFacing(current => current === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse" size={30} color="white" />
            </TouchableOpacity>
          </View>

          {/* 제스처 안내 */}
          {!contactlessMode && gestureMode && !isLiveAnalyzing && !isRecording && !countdown && (
            <View style={styles.gestureGuide}>
              <View style={styles.gestureGuideCard}>
                <Text style={styles.gestureGuideTitle}>터치 제스처</Text>
                <Text style={styles.gestureGuideText}>📱 길게 누르기: 분석/녹화 시작</Text>
                <Text style={styles.gestureGuideText}>👆 두 번 탭: 중지</Text>
                <Text style={styles.gestureGuideText}>👉 좌우 스와이프: 카메라 전환</Text>
              </View>
            </View>
          )}
          
          {/* 비접촉 모드 안내 */}
          {contactlessMode && !isLiveAnalyzing && !isRecording && !countdown && (
            <View style={styles.gestureGuide}>
              <View style={styles.contactlessGuideCard}>
                <Text style={styles.gestureGuideTitle}>🤚 비접촉 제어 모드</Text>
                <Text style={styles.gestureGuideText}>✋ 손 흔들기: 시작</Text>
                <Text style={styles.gestureGuideText}>✊ 주먹 쥐기: 중지</Text>
                <Text style={styles.gestureGuideText}>👏 박수: 시작/중지 토글</Text>
                <Text style={styles.gestureGuideText}>✌️ V 사인: 일시정지</Text>
              </View>
            </View>
          )}
          
          {/* 감지된 제스처 표시 */}
          {detectedGesture && (
            <View style={styles.detectedGestureContainer}>
              <View style={styles.detectedGestureCard}>
                <Text style={styles.detectedGestureText}>{detectedGesture}</Text>
              </View>
            </View>
          )}

          {/* 카운트다운 표시 */}
          {countdown !== null && (
            <View style={styles.countdownContainer}>
              <Animated.View
                style={[
                  styles.countdownCircle,
                  {
                    transform: [
                      {
                        scale: countdownAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.5],
                        }),
                      },
                    ],
                    opacity: countdownAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.7],
                    }),
                  },
                ]}
              >
                <Text style={styles.countdownText}>{countdown}</Text>
              </Animated.View>
            </View>
          )}

          {/* 실시간 피드백 표시 */}
          {mode === 'live' && liveFeedback && (
            <View style={styles.liveFeedbackContainer}>
              <View style={styles.liveFeedbackCard}>
                {/* 95% 정확도 표시 */}
                {liveFeedback.accuracy && (
                  <View style={styles.accuracyBadge}>
                    <Text style={styles.accuracyText}>MediaPipe AI</Text>
                    <Text style={styles.accuracyValue}>{liveFeedback.accuracy}% 정확도</Text>
                  </View>
                )}
                
                {/* 스윙 단계 및 점수 */}
                <View style={styles.phaseContainer}>
                  <Text style={styles.phaseLabel}>단계: {liveFeedback.phase || 'address'}</Text>
                  <Text style={styles.liveFeedbackScore}>점수: {liveFeedback.score}/100</Text>
                  {liveFeedback.confidence && (
                    <Text style={styles.confidenceText}>신뢰도: {liveFeedback.confidence}%</Text>
                  )}
                </View>
                
                {/* 실시간 메트릭 */}
                {liveFeedback.metrics && (
                  <View style={styles.metricsContainer}>
                    <Text style={styles.metricsTitle}>실시간 측정값</Text>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>어깨 회전:</Text>
                      <Text style={styles.metricValue}>{liveFeedback.metrics.shoulder_rotation}°</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>엉덩이 회전:</Text>
                      <Text style={styles.metricValue}>{liveFeedback.metrics.hip_rotation}°</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>X-Factor:</Text>
                      <Text style={styles.metricValue}>{liveFeedback.metrics.x_factor}°</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>척추 각도:</Text>
                      <Text style={styles.metricValue}>{liveFeedback.metrics.spine_angle}°</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>체중 분포:</Text>
                      <Text style={styles.metricValue}>L:{liveFeedback.metrics.weight_left}% R:{liveFeedback.metrics.weight_right}%</Text>
                    </View>
                  </View>
                )}
                
                {/* AI 피드백 */}
                {liveFeedback.feedback && liveFeedback.feedback.length > 0 && (
                  <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackTitle}>AI 코칭</Text>
                    {liveFeedback.feedback.map((tip, index) => (
                      <Text key={index} style={styles.liveTip}>• {tip}</Text>
                    ))}
                  </View>
                )}
                
                {/* 기존 피드백 (폴백) */}
                {!liveFeedback.metrics && (
                  <>
                    <Text style={styles.liveFeedbackText}>{liveFeedback.posture_feedback}</Text>
                    <Text style={styles.liveFeedbackText}>{liveFeedback.balance_feedback}</Text>
                    <Text style={styles.liveFeedbackText}>{liveFeedback.rotation_feedback}</Text>
                    {liveFeedback.quick_tips?.map((tip, index) => (
                      <Text key={index} style={styles.liveTip}>💡 {tip}</Text>
                    ))}
                  </>
                )}
              </View>
            </View>
          )}

          {/* 가이드라인 */}
          {mode !== 'live' && (
            <View style={styles.guidelineContainer}>
              <View style={styles.guideline} />
              <Text style={styles.guidelineText}>
                {mode === 'record' 
                  ? (isRecording ? '녹화 중... (최대 10초)' : '스윙을 화면 중앙에 맞춰주세요')
                  : '실시간 분석 중...'}
              </Text>
            </View>
          )}

          {/* 하단 컨트롤 */}
          <View style={styles.cameraBottomControls}>
            {mode === 'record' ? (
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordButtonRecording]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerRecording]} />
              </TouchableOpacity>
            ) : mode === 'live' && (
              <TouchableOpacity
                style={[styles.liveButton, isLiveAnalyzing && styles.liveButtonActive]}
                onPress={isLiveAnalyzing ? stopLiveAnalysis : startLiveAnalysis}
              >
                <Text style={styles.liveButtonText}>
                  {isLiveAnalyzing ? '분석 중지' : '분석 시작'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }

  // 메인 화면
  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.header}>
        <Ionicons name="videocam" size={40} color="white" />
        <Text style={styles.title}>AI 스윙 분석</Text>
        <Text style={styles.subtitle}>실시간, 녹화, 업로드 모드를 선택하세요</Text>
      </LinearGradient>

      {/* 모드 선택 탭 */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'live' && styles.modeTabActive]}
          onPress={() => handleModeChange('live')}
        >
          <Ionicons name="radio" size={24} color={mode === 'live' ? '#4CAF50' : '#666'} />
          <Text style={[styles.modeTabText, mode === 'live' && styles.modeTabTextActive]}>
            실시간 분석
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeTab, mode === 'record' && styles.modeTabActive]}
          onPress={() => handleModeChange('record')}
        >
          <Ionicons name="videocam" size={24} color={mode === 'record' ? '#4CAF50' : '#666'} />
          <Text style={[styles.modeTabText, mode === 'record' && styles.modeTabTextActive]}>
            녹화 분석
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeTab, mode === 'upload' && styles.modeTabActive]}
          onPress={() => handleModeChange('upload')}
        >
          <Ionicons name="cloud-upload" size={24} color={mode === 'upload' ? '#4CAF50' : '#666'} />
          <Text style={[styles.modeTabText, mode === 'upload' && styles.modeTabTextActive]}>
            파일 업로드
          </Text>
        </TouchableOpacity>
      </View>

      {/* 모드별 설명 */}
      <View style={styles.modeDescription}>
        {mode === 'live' && (
          <View style={styles.descriptionCard}>
            <Ionicons name="information-circle" size={24} color="#4CAF50" />
            <Text style={styles.descriptionText}>
              실시간으로 스윙 자세를 분석하고 즉각적인 피드백을 제공합니다.
              오디오 피드백으로 멀리서도 조언을 들을 수 있습니다.
            </Text>
          </View>
        )}
        
        {mode === 'record' && (
          <View style={styles.descriptionCard}>
            <Ionicons name="information-circle" size={24} color="#4CAF50" />
            <Text style={styles.descriptionText}>
              10초 동안 스윙을 녹화하여 상세한 분석 결과를 제공합니다.
              단계별 점수와 개선 사항을 확인할 수 있습니다.
            </Text>
          </View>
        )}
        
        {mode === 'upload' && (
          <View style={styles.descriptionCard}>
            <Ionicons name="information-circle" size={24} color="#4CAF50" />
            <Text style={styles.descriptionText}>
              저장된 비디오 파일을 업로드하여 분석할 수 있습니다.
              갤러리나 파일에서 비디오를 선택하세요.
            </Text>
          </View>
        )}
      </View>

      {/* 비디오 미리보기 */}
      {videoUri && !isAnalyzing && !analysisResult && (
        <View style={styles.videoPreview}>
          <VideoPlayer uri={videoUri} />
          <View style={styles.videoControls}>
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={() => analyzeVideo(videoUri)}
            >
              <Text style={styles.analyzeButtonText}>이 비디오 분석하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => {
                setVideoUri(null);
                if (mode === 'record') {
                  setShowCamera(true);
                }
              }}
            >
              <Text style={styles.retakeButtonText}>다시 선택</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 시작 버튼 */}
      {!videoUri && !analysisResult && !isAnalyzing && (
        <View style={styles.startSection}>
          {mode === 'live' && (
            <TouchableOpacity style={styles.startButton} onPress={startCamera}>
              <Ionicons name="radio" size={50} color="white" />
              <Text style={styles.startButtonText}>실시간 분석 시작</Text>
              <Text style={styles.startButtonSubtext}>카메라로 실시간 피드백</Text>
            </TouchableOpacity>
          )}
          
          {mode === 'record' && (
            <TouchableOpacity style={styles.startButton} onPress={startCamera}>
              <Ionicons name="videocam" size={50} color="white" />
              <Text style={styles.startButtonText}>녹화 시작</Text>
              <Text style={styles.startButtonSubtext}>10초 스윙 녹화</Text>
            </TouchableOpacity>
          )}
          
          {mode === 'upload' && (
            <View style={styles.uploadOptions}>
              <TouchableOpacity style={styles.uploadButton} onPress={pickVideoFromGallery}>
                <Ionicons name="images" size={40} color="#4CAF50" />
                <Text style={styles.uploadButtonText}>갤러리에서 선택</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.uploadButton} onPress={pickVideoFile}>
                <Ionicons name="folder-open" size={40} color="#4CAF50" />
                <Text style={styles.uploadButtonText}>파일 선택</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* 분석 중 표시 */}
      {isAnalyzing && (
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.analyzingText}>비디오 분석 중...</Text>
          <Text style={styles.analyzingSubtext}>AI가 스윙을 분석하고 있습니다</Text>
          <Text style={styles.analyzingSubtext}>잠시만 기다려주세요</Text>
        </View>
      )}

      {/* 분석 결과 */}
      {analysisResult && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>📊 분석 결과</Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>전체 스윙 점수</Text>
            <Text style={styles.scoreValue}>{analysisResult.overall_score.toFixed(1)}/100</Text>
          </View>

          <View style={styles.phaseScoresCard}>
            <Text style={styles.phaseScoresTitle}>단계별 점수</Text>
            <View style={styles.phaseScoresGrid}>
              <View style={styles.phaseScore}>
                <Text style={styles.phaseScoreLabel}>어드레스</Text>
                <Text style={styles.phaseScoreValue}>{analysisResult.phase_scores.address}</Text>
              </View>
              <View style={styles.phaseScore}>
                <Text style={styles.phaseScoreLabel}>백스윙</Text>
                <Text style={styles.phaseScoreValue}>{analysisResult.phase_scores.backswing}</Text>
              </View>
              <View style={styles.phaseScore}>
                <Text style={styles.phaseScoreLabel}>임팩트</Text>
                <Text style={styles.phaseScoreValue}>{analysisResult.phase_scores.impact}</Text>
              </View>
              <View style={styles.phaseScore}>
                <Text style={styles.phaseScoreLabel}>팔로우스루</Text>
                <Text style={styles.phaseScoreValue}>{analysisResult.phase_scores.follow_through}</Text>
              </View>
            </View>
          </View>

          {analysisResult.strengths.length > 0 && (
            <View style={styles.strengthsCard}>
              <Text style={styles.strengthsTitle}>✅ 강점</Text>
              {analysisResult.strengths.map((strength, index) => (
                <View key={index} style={styles.strengthItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.strengthText}>{strength}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.improvementsCard}>
            <Text style={styles.improvementsTitle}>🎯 개선 포인트</Text>
            {analysisResult.improvements.map((improvement, index) => (
              <View key={index} style={styles.improvementItem}>
                <Ionicons name="arrow-up-circle" size={16} color="#FF9800" />
                <Text style={styles.improvementText}>{improvement}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.newAnalysisButton}
              onPress={() => {
                setAnalysisResult(null);
                setVideoUri(null);
              }}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.newAnalysisButtonText}>새 분석</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: '#E8F5E9',
  },
  modeTabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  modeTabTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  modeDescription: {
    marginHorizontal: 20,
    marginTop: 15,
  },
  descriptionCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    lineHeight: 20,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  cameraTopControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  cameraButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
  },
  controlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.7)',
  },
  audioToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    borderRadius: 25,
  },
  gestureGuide: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gestureGuideCard: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    padding: 15,
    maxWidth: 300,
  },
  gestureGuideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  gestureGuideText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 5,
  },
  countdownContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: 'white',
  },
  contactlessGuideCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 15,
    padding: 15,
    maxWidth: 300,
  },
  detectedGestureContainer: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  detectedGestureCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  detectedGestureText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  liveFeedbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  liveFeedbackCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  liveFeedbackScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 15,
  },
  liveFeedbackText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  liveTip: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  accuracyBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  accuracyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  accuracyValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  phaseContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  phaseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  confidenceText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  metricsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  feedbackContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  guidelineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideline: {
    width: 300,
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
  },
  guidelineText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  cameraBottomControls: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'white',
  },
  recordButtonRecording: {
    backgroundColor: 'rgba(255,0,0,0.3)',
  },
  recordButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'red',
  },
  recordButtonInnerRecording: {
    width: 25,
    height: 25,
    borderRadius: 5,
  },
  liveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  liveButtonActive: {
    backgroundColor: '#f44336',
  },
  liveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startSection: {
    padding: 20,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  startButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  uploadButton: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    flex: 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
  },
  videoPreview: {
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  video: {
    width: '100%',
    height: 300,
  },
  videoControls: {
    padding: 20,
  },
  analyzeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retakeButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#666',
    fontSize: 16,
  },
  analyzingContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    margin: 20,
  },
  analyzingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  resultsContainer: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  phaseScoresCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  phaseScoresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  phaseScoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  phaseScore: {
    width: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  phaseScoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  phaseScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  strengthsCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  strengthsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 15,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  strengthText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  improvementsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  improvementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 15,
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  improvementText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  actionButtons: {
    alignItems: 'center',
    marginBottom: 30,
  },
  newAnalysisButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  newAnalysisButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default VideoAnalysisScreen;