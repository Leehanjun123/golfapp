// 스윙 분석 유틸리티 함수들 (TensorFlow 제거)
const sharp = require('sharp');

/**
 * 이미지에서 스윙 데이터 추출
 */
async function extractSwingData(imageBase64) {
  try {
    if (!imageBase64) {
      return {
        hasValidData: false,
        keypoints: [],
        confidence: 0
      };
    }

    // Base64 디코딩 (타입 체크 추가)
    let imageBuffer;
    
    if (Buffer.isBuffer(imageBase64)) {
      // 이미 버퍼인 경우
      imageBuffer = imageBase64;
    } else if (typeof imageBase64 === 'string') {
      // 문자열인 경우
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      throw new Error('Invalid image data type');
    }

    // 이미지 메타데이터 확인
    const metadata = await sharp(imageBuffer).metadata();
    
    // 기본 스윙 데이터 구조
    const swingData = {
      hasValidData: true,
      imageWidth: metadata.width,
      imageHeight: metadata.height,
      timestamp: Date.now(),
      keypoints: generateKeypoints(metadata),
      confidence: 0.85,
      phase: detectPhaseFromImage(imageBuffer),
      metrics: {
        bodyAngle: calculateBodyAngle(),
        armAngle: calculateArmAngle(),
        hipRotation: calculateHipRotation(),
        shoulderRotation: calculateShoulderRotation()
      }
    };

    return swingData;
  } catch (error) {
    console.error('스윙 데이터 추출 오류:', error);
    return {
      hasValidData: false,
      error: error.message
    };
  }
}

/**
 * 스윙 점수 계산
 */
async function calculateSwingScore(swingData) {
  try {
    if (!swingData || !swingData.hasValidData) {
      return {
        score: 0,
        breakdown: {},
        feedback: ['유효한 스윙 데이터가 없습니다']
      };
    }

    let score = 100;
    const breakdown = {
      posture: 20,
      balance: 20,
      rotation: 20,
      tempo: 20,
      followThrough: 20
    };

    // 자세 점수
    if (swingData.metrics.bodyAngle < 25 || swingData.metrics.bodyAngle > 35) {
      breakdown.posture -= 5;
      score -= 5;
    }

    // 균형 점수
    if (!swingData.keypoints || swingData.keypoints.length < 10) {
      breakdown.balance -= 10;
      score -= 10;
    }

    // 회전 점수
    const xFactor = Math.abs(swingData.metrics.shoulderRotation - swingData.metrics.hipRotation);
    if (xFactor < 30 || xFactor > 60) {
      breakdown.rotation -= 5;
      score -= 5;
    }

    // 피드백 생성
    const feedback = generateFeedback(breakdown, swingData);

    return {
      score: Math.max(0, Math.min(100, score)),
      breakdown,
      feedback,
      phase: swingData.phase || 'unknown',
      confidence: swingData.confidence || 0
    };
  } catch (error) {
    console.error('점수 계산 오류:', error);
    return {
      score: 50,
      breakdown: {},
      feedback: ['분석 중 오류가 발생했습니다']
    };
  }
}

/**
 * 비디오에서 프레임 추출
 */
async function extractFramesFromVideo(videoBase64, options = {}) {
  try {
    const {
      frameCount = 10,
      interval = 100, // ms
      startTime = 0,
      endTime = null
    } = options;

    // 비디오 처리는 복잡하므로 일단 모의 프레임 반환
    const frames = [];
    
    for (let i = 0; i < frameCount; i++) {
      // 실제로는 ffmpeg나 다른 라이브러리 사용 필요
      frames.push({
        index: i,
        timestamp: startTime + (i * interval),
        data: videoBase64, // 임시로 같은 데이터 사용
        isKeyFrame: i % 3 === 0
      });
    }

    return {
      success: true,
      frames,
      totalFrames: frameCount,
      duration: frameCount * interval
    };
  } catch (error) {
    console.error('프레임 추출 오류:', error);
    return {
      success: false,
      frames: [],
      error: error.message
    };
  }
}

/**
 * 비디오 프레임 분석
 */
async function analyzeVideoFrames(frames, options = {}) {
  try {
    if (!frames || frames.length === 0) {
      return {
        success: false,
        error: '분석할 프레임이 없습니다'
      };
    }

    const analyses = [];
    let bestFrame = null;
    let bestScore = 0;

    // 각 프레임 분석
    for (const frame of frames) {
      const swingData = await extractSwingData(frame.data);
      const scoreData = await calculateSwingScore(swingData);
      
      analyses.push({
        frameIndex: frame.index,
        timestamp: frame.timestamp,
        score: scoreData.score,
        phase: swingData.phase,
        metrics: swingData.metrics
      });

      // 최고 점수 프레임 추적
      if (scoreData.score > bestScore) {
        bestScore = scoreData.score;
        bestFrame = frame.index;
      }
    }

    // 전체 스윙 분석
    const overallAnalysis = combineFrameAnalyses(analyses);

    return {
      success: true,
      frameAnalyses: analyses,
      bestFrame,
      bestScore,
      overall: overallAnalysis,
      timeline: createSwingTimeline(analyses)
    };
  } catch (error) {
    console.error('프레임 분석 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 헬퍼 함수들

function generateKeypoints(metadata) {
  // 임시 키포인트 생성 (실제로는 포즈 감지 필요)
  const keypoints = [];
  const centerX = metadata.width / 2;
  const centerY = metadata.height / 2;

  const bodyParts = [
    'head', 'neck', 'leftShoulder', 'rightShoulder',
    'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist',
    'leftHip', 'rightHip', 'leftKnee', 'rightKnee',
    'leftAnkle', 'rightAnkle'
  ];

  bodyParts.forEach((part, i) => {
    keypoints.push({
      part,
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 300,
      confidence: 0.7 + Math.random() * 0.3
    });
  });

  return keypoints;
}

function detectPhaseFromImage(imageBuffer) {
  // 스윙 단계 감지 (실제로는 AI 모델 필요)
  const phases = [
    'address', 'takeaway', 'backswing', 'top',
    'downswing', 'impact', 'follow_through', 'finish'
  ];
  
  // 임시로 랜덤 선택
  return phases[Math.floor(Math.random() * phases.length)];
}

function calculateBodyAngle() {
  // 척추 각도 계산 (이상적: 30도)
  return 25 + Math.random() * 10;
}

function calculateArmAngle() {
  // 팔 각도 계산
  return 70 + Math.random() * 40;
}

function calculateHipRotation() {
  // 엉덩이 회전 계산 (이상적: 45도)
  return 35 + Math.random() * 20;
}

function calculateShoulderRotation() {
  // 어깨 회전 계산 (이상적: 90도)
  return 70 + Math.random() * 40;
}

function generateFeedback(breakdown, swingData) {
  const feedback = [];

  if (breakdown.posture < 20) {
    feedback.push('🎯 척추 각도를 30도로 유지하세요');
  }
  
  if (breakdown.balance < 20) {
    feedback.push('⚖️ 체중 이동을 더 부드럽게 하세요');
  }
  
  if (breakdown.rotation < 20) {
    feedback.push('🔄 상체와 하체의 회전 차이(X-Factor)를 늘리세요');
  }
  
  if (breakdown.tempo < 20) {
    feedback.push('⏱️ 백스윙을 더 천천히, 다운스윙을 더 빠르게');
  }
  
  if (breakdown.followThrough < 20) {
    feedback.push('🏌️ 팔로우스루를 끝까지 완성하세요');
  }

  if (feedback.length === 0) {
    feedback.push('✨ 훌륭한 스윙입니다! 일관성을 유지하세요');
  }

  return feedback;
}

function combineFrameAnalyses(analyses) {
  if (!analyses || analyses.length === 0) {
    return null;
  }

  const avgScore = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length;
  
  // 스윙 단계별 그룹화
  const phaseGroups = {};
  analyses.forEach(a => {
    if (!phaseGroups[a.phase]) {
      phaseGroups[a.phase] = [];
    }
    phaseGroups[a.phase].push(a);
  });

  return {
    averageScore: Math.round(avgScore),
    frameCount: analyses.length,
    phases: Object.keys(phaseGroups),
    phaseScores: Object.entries(phaseGroups).map(([phase, items]) => ({
      phase,
      avgScore: Math.round(items.reduce((sum, i) => sum + i.score, 0) / items.length)
    }))
  };
}

function createSwingTimeline(analyses) {
  return analyses.map(a => ({
    time: a.timestamp,
    phase: a.phase,
    score: a.score
  }));
}

// 추가 유틸리티 함수들

/**
 * 이미지 유효성 검증
 */
function validateImage(imageBase64) {
  if (!imageBase64) {
    return { valid: false, error: '이미지가 없습니다' };
  }

  // Base64 형식 체크
  const base64Regex = /^data:image\/(png|jpeg|jpg|gif);base64,/;
  if (!base64Regex.test(imageBase64)) {
    return { valid: false, error: '잘못된 이미지 형식입니다' };
  }

  // 크기 체크 (10MB 제한)
  const sizeInBytes = (imageBase64.length * 3) / 4;
  if (sizeInBytes > 10 * 1024 * 1024) {
    return { valid: false, error: '이미지가 너무 큽니다 (최대 10MB)' };
  }

  return { valid: true };
}

/**
 * 스윙 단계 전환 감지
 */
function detectPhaseTransition(prevPhase, currentPhase) {
  const phaseOrder = [
    'address', 'takeaway', 'backswing', 'top',
    'downswing', 'impact', 'follow_through', 'finish'
  ];

  const prevIndex = phaseOrder.indexOf(prevPhase);
  const currIndex = phaseOrder.indexOf(currentPhase);

  if (currIndex > prevIndex) {
    return 'forward';
  } else if (currIndex < prevIndex) {
    return 'backward';
  }
  return 'same';
}

module.exports = {
  extractSwingData,
  calculateSwingScore,
  extractFramesFromVideo,
  analyzeVideoFrames,
  validateImage,
  detectPhaseTransition,
  generateKeypoints,
  detectPhaseFromImage,
  generateFeedback
};