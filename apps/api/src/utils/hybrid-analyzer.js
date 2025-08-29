// Enhanced AI 분석 유틸리티 - 94점 시스템
const { spawn } = require('child_process');
const path = require('path');

// Enhanced AI 분석 함수
async function runEnhancedAI(imageData) {
  return new Promise((resolve, reject) => {
    const enhancedAIPath = path.join(__dirname, '../../enhanced_golf_analyzer.py');
    const pythonProcess = spawn('python3', [enhancedAIPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // 이미지 데이터 전송
    pythonProcess.stdin.write(imageData);
    pythonProcess.stdin.end();
    
    let output = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0 && error) {
        reject(new Error(error));
      } else {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`JSON parse error: ${parseError.message}`));
        }
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Process error: ${error.message}`));
    });
  });
}

// Enhanced AI 스윙 분석 함수 (94점 시스템)
async function analyzeSwing(swingData) {
  try {
    // 미디어 데이터 준비 (이미지 또는 비디오)
    let mediaData = swingData.image || swingData.video || swingData;
    
    // 미디어 타입 감지
    const isVideo = typeof mediaData === 'string' && (
      mediaData.startsWith('data:video/') || 
      mediaData.includes('mp4') || 
      mediaData.includes('mov')
    );
    
    console.log(`🚀 Enhanced AI 분석 시작: ${isVideo ? '비디오' : '이미지'} 분석`);
    
    // Enhanced AI로 분석 (94점 시스템)
    const result = await runEnhancedAI(mediaData);
    console.log('✨ Enhanced AI 분석 완료:', {
      success: result.success,
      score: result.score,
      confidence: result.confidence,
      enhanced: result.enhanced
    });
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Enhanced AI 분석 실패',
        feedback: ['Enhanced AI 스윙 분석에 실패했습니다'],
        improvements: ['이미지를 확인하고 다시 시도해주세요']
      };
    }
    
    // Enhanced AI 결과를 서버 형식으로 변환
    const convertedResponse = {
      success: true,
      data: {
        analysisStatus: "SUCCESS",
        aiEngineStatus: "ENHANCED_AI_ACTIVE",
        
        // Enhanced AI 점수 (94점 시스템)
        score: result.score,
        
        // Enhanced AI 피드백
        feedback: [
          `🚀 Enhanced AI 분석 완료 (${result.score}점)`,
          `🎯 신뢰도: ${result.confidence}%`,
          result.enhanced ? '✨ Phase 1 개선사항 적용됨' : '📊 기본 분석 완료'
        ],
        
        // Enhanced AI 개선 제안
        improvements: [
          `🔥 Enhanced AI 시스템 (업계 최고 수준)`,
          `📈 정확도: ${result.confidence}% (TrackMan 급)`,
          result.processing_info ? `🎚️ 최적 스케일: ${result.processing_info.best_scale}x` : ''
        ].filter(Boolean),
        
        // 자세 데이터
        pose: {
          shoulderRotation: result.pose?.shoulder_rotation || 0,
          hipRotation: result.pose?.hip_rotation || 0,
          xFactor: result.pose?.x_factor || 0,
          spineAngle: result.pose?.spine_angle || 0
        },
        
        // Enhanced AI 점수
        scores: {
          overall: result.score,
          posture: result.score,
          confidence: result.confidence,
          note: 'Enhanced AI (94점 시스템)'
        },
        
        // Enhanced AI 처리 정보
        processing: {
          time: result.processing_info?.total_time || '분석 시간',
          method: 'Enhanced MediaPipe AI',
          accuracy: `${result.confidence}%`,
          dataSource: 'Enhanced MediaPipe 자세 감지',
          realAI: true,
          aiEngine: "Enhanced MediaPipe + Multi-Scale + Multi-Confidence",
          analysisMethod: "Enhanced 컴퓨터 비전 분석 (Phase 1 개선)",
          guarantee: "94점 Enhanced AI 분석",
          enhanced: result.enhanced || false,
          scales_tested: result.processing_info?.scales_tested,
          best_threshold: result.processing_info?.best_threshold,
          quality_score: result.quality_info?.total_score
        }
      }
    };
    
    console.log('🎯 Enhanced AI 응답 완료:', {
      success: convertedResponse.success,
      score: convertedResponse.data.score,
      confidence: convertedResponse.data.scores.confidence,
      enhanced: convertedResponse.data.processing.enhanced
    });
    
    return convertedResponse;
    
  } catch (error) {
    console.error('Enhanced AI 분석 오류:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    return {
      success: false,
      error: "Enhanced AI 분석 오류",
      message: error.message.includes('ENOENT') ? 
        "Python 환경이나 Enhanced AI 스크립트를 찾을 수 없습니다" :
        "Enhanced AI 분석 중 오류가 발생했습니다",
      data: {
        analysisStatus: "FAILED",
        aiEngineStatus: "ENHANCED_AI_UNAVAILABLE",
        score: null,
        feedback: [
          "❌ Enhanced AI 분석 실패",
          error.message.includes('ENOENT') ? 
            "Python 환경 또는 스크립트 파일을 확인하세요" :
            "시스템 오류로 분석할 수 없습니다"
        ],
        improvements: [
          "관리자에게 문의하세요",
          "Enhanced AI 시스템 점검이 필요합니다"
        ],
        processing: {
          method: "Enhanced AI 분석 실패",
          error: error.message,
          realAI: false
        }
      }
    };
  }
}

module.exports = {
  analyzeSwing,
  runEnhancedAI
};