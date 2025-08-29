// 제스처 및 소리 감지 모듈
const sharp = require('sharp');

// 손동작 감지 (이미지 분석)
async function detectHandGesture(imageBase64) {
  try {
    if (!imageBase64) return null;
    
    // 실제로는 MediaPipe나 TensorFlow.js를 사용해야 하지만
    // 여기서는 간단한 시뮬레이션
    const imageBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const metadata = await sharp(imageBuffer).metadata();
    const stats = await sharp(imageBuffer).stats();
    
    // 밝기 변화로 손동작 감지 시뮬레이션
    const brightness = stats.channels[0].mean;
    
    // 손동작 패턴 분석
    const gestures = {
      wave: false,      // 손 흔들기
      thumbsUp: false,  // 엄지 척
      peace: false,     // V 사인
      fist: false,      // 주먹
      open: false,      // 손바닥
      pointing: false   // 가리키기
    };
    
    // 이미지 특성 분석으로 제스처 추정
    const avgRed = stats.channels[0].mean;
    const avgGreen = stats.channels[1].mean;
    const avgBlue = stats.channels[2].mean;
    
    // 피부색 감지 (간단한 휴리스틱)
    const isSkinTone = (avgRed > 95 && avgGreen > 40 && avgBlue > 20) &&
                       (Math.max(avgRed, avgGreen, avgBlue) - Math.min(avgRed, avgGreen, avgBlue) > 15) &&
                       (Math.abs(avgRed - avgGreen) > 15) && 
                       (avgRed > avgGreen && avgRed > avgBlue);
    
    // 움직임/변화량 감지
    const variance = stats.channels[0].stdev;
    
    if (isSkinTone) {
      // 피부색이 감지되면 제스처 가능성 높음
      if (brightness > 160 && variance > 30) {
        // 밝고 변화가 크면 손을 흔드는 중
        gestures.wave = true;
      } else if (brightness > 140 && brightness < 160) {
        // 중간 밝기면 손바닥
        gestures.open = true;
      } else if (brightness < 120 && variance < 20) {
        // 어둡고 균일하면 주먹
        gestures.fist = true;
      } else if (variance > 40) {
        // 변화가 매우 크면 V사인
        gestures.peace = true;
      }
    } else {
      // 피부색이 없으면 높은 확률로 제스처 아님
      // 그래도 매우 특징적인 패턴이면 인식
      if (brightness > 180 && variance > 50) {
        gestures.wave = true; // 매우 밝고 움직임이 크면 손 흔들기
      }
    }
    
    // 가장 가능성 높은 제스처 반환
    for (const [gesture, detected] of Object.entries(gestures)) {
      if (detected) {
        console.log(`Gesture detected: ${gesture}, Brightness: ${brightness}, Variance: ${variance}, SkinTone: ${isSkinTone}`);
        return {
          gesture,
          confidence: isSkinTone ? 0.85 : 0.65, // 피부색 감지 시 높은 신뢰도
          action: getActionForGesture(gesture)
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Hand gesture detection error:', error);
    return null;
  }
}

// 제스처에 따른 액션 매핑
function getActionForGesture(gesture) {
  const actionMap = {
    wave: 'start',      // 손 흔들기 -> 시작
    thumbsUp: 'confirm', // 엄지 척 -> 확인
    peace: 'pause',     // V 사인 -> 일시정지
    fist: 'stop',       // 주먹 -> 중지
    open: 'ready',      // 손바닥 -> 준비
    pointing: 'next'    // 가리키기 -> 다음
  };
  
  return actionMap[gesture] || null;
}

// 박수 소리 감지 (오디오 분석)
function detectClapSound(audioData) {
  try {
    if (!audioData) return null;
    
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // 오디오 데이터가 너무 작으면 무시
    if (audioBuffer.length < 1000) return null;
    
    // 진폭 분석
    let maxAmplitude = 0;
    let avgAmplitude = 0;
    let peakCount = 0;
    const threshold = 5000;
    
    for (let i = 0; i < Math.min(audioBuffer.length, 4000); i += 2) {
      if (i + 1 < audioBuffer.length) {
        const sample = Math.abs(audioBuffer.readInt16LE(i));
        maxAmplitude = Math.max(maxAmplitude, sample);
        avgAmplitude += sample;
        
        // 피크 카운트 (박수 특징)
        if (sample > threshold) {
          peakCount++;
        }
      }
    }
    
    avgAmplitude = avgAmplitude / (audioBuffer.length / 2);
    
    // 박수 감지 조건:
    // 1. 최대 진폭이 충분히 크고
    // 2. 평균 진폭은 낮고 (짧은 충격음)
    // 3. 피크가 있음
    const isClap = maxAmplitude > 8000 && avgAmplitude < 2000 && peakCount > 0;
    
    console.log(`Audio analysis - Max: ${maxAmplitude}, Avg: ${avgAmplitude}, Peaks: ${peakCount}, IsClap: ${isClap}`);
    
    if (isClap) {
      return {
        detected: true,
        confidence: Math.min(0.9, peakCount / 10), // 피크 수에 따른 신뢰도
        count: Math.min(3, Math.floor(peakCount / 5) + 1),
        action: 'toggle'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Clap detection error:', error);
    return null;
  }
}

// 박수 횟수 감지
function detectClapCount(audioBuffer) {
  // 실제로는 피크 감지 알고리즘이 필요
  // 여기서는 간단히 1-3회 랜덤 반환
  return Math.floor(Math.random() * 3) + 1;
}

// 음성 명령 감지
function detectVoiceCommand(audioData) {
  // 실제로는 음성 인식 API 필요
  // 간단한 시뮬레이션
  const commands = [
    { command: 'start', korean: '시작' },
    { command: 'stop', korean: '정지' },
    { command: 'pause', korean: '일시정지' },
    { command: 'record', korean: '녹화' },
    { command: 'analyze', korean: '분석' }
  ];
  
  // 랜덤하게 명령 감지 시뮬레이션
  if (Math.random() > 0.7) {
    const randomCommand = commands[Math.floor(Math.random() * commands.length)];
    return {
      detected: true,
      command: randomCommand.command,
      text: randomCommand.korean,
      confidence: 0.75
    };
  }
  
  return null;
}

module.exports = {
  detectHandGesture,
  detectClapSound,
  detectVoiceCommand,
  getActionForGesture
};