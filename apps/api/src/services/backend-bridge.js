// Node.js와 FastAPI 백엔드 연결 브리지
const axios = require('axios');

class BackendBridge {
  constructor() {
    // FastAPI 백엔드 주소 (있다면)
    this.FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
    this.isAvailable = false;
    this.checkAvailability();
  }

  // FastAPI 백엔드 가용성 체크
  async checkAvailability() {
    try {
      const response = await axios.get(`${this.FASTAPI_URL}/health`, {
        timeout: 2000
      });
      this.isAvailable = response.status === 200;
      console.log('✅ FastAPI 백엔드 연결:', this.FASTAPI_URL);
    } catch (error) {
      this.isAvailable = false;
      console.log('⚠️ FastAPI 백엔드 사용 불가 - 로컬 AI만 사용');
    }
  }

  // Ultimate 분석 (고급 AI)
  async ultimateAnalyze(imageBase64) {
    if (!this.isAvailable) {
      // FastAPI 없으면 로컬 분석 사용
      const { analyzeGolfSwing } = require('../analyzers/professional-golf-analyzer');
      return await analyzeGolfSwing(imageBase64);
    }

    try {
      const response = await axios.post(
        `${this.FASTAPI_URL}/ultimate-analyze`,
        { image: imageBase64 },
        { timeout: 10000 }
      );
      
      return response.data;
    } catch (error) {
      console.error('FastAPI 호출 실패:', error.message);
      // 폴백: 로컬 분석
      const { analyzeGolfSwing } = require('../analyzers/professional-golf-analyzer');
      return await analyzeGolfSwing(imageBase64);
    }
  }

  // 비디오 분석 (고급)
  async analyzeVideoAdvanced(videoBase64) {
    if (!this.isAvailable) {
      // 로컬 분석 사용
      const { extractFramesFromVideo, analyzeVideoFrames } = require('../utils/swing-utils');
      const frames = await extractFramesFromVideo(videoBase64);
      return await analyzeVideoFrames(frames.frames);
    }

    try {
      const response = await axios.post(
        `${this.FASTAPI_URL}/analyze-video`,
        { video: videoBase64 },
        { timeout: 30000 }
      );
      
      return response.data;
    } catch (error) {
      console.error('비디오 분석 실패:', error.message);
      // 폴백
      const { extractFramesFromVideo, analyzeVideoFrames } = require('../utils/swing-utils');
      const frames = await extractFramesFromVideo(videoBase64);
      return await analyzeVideoFrames(frames.frames);
    }
  }

  // 프로 비교 분석
  async compareWithPro(userSwing, proSwing = null) {
    if (!this.isAvailable) {
      // 로컬에서 간단한 비교
      return this.localCompareWithPro(userSwing);
    }

    try {
      const response = await axios.post(
        `${this.FASTAPI_URL}/compare-with-pro`,
        { 
          user_swing: userSwing,
          pro_swing: proSwing 
        },
        { timeout: 15000 }
      );
      
      return response.data;
    } catch (error) {
      return this.localCompareWithPro(userSwing);
    }
  }

  // 로컬 프로 비교 (간단한 버전)
  localCompareWithPro(userSwing) {
    const proStandards = {
      shoulder_rotation: 90,
      hip_rotation: 45,
      x_factor: 45,
      tempo_ratio: 3.0,
      club_head_speed: 113
    };

    // 간단한 비교 로직
    const comparison = {
      shoulder_rotation: {
        user: userSwing.metrics?.shoulder_rotation || 0,
        pro: proStandards.shoulder_rotation,
        difference: Math.abs((userSwing.metrics?.shoulder_rotation || 0) - proStandards.shoulder_rotation)
      },
      hip_rotation: {
        user: userSwing.metrics?.hip_rotation || 0,
        pro: proStandards.hip_rotation,
        difference: Math.abs((userSwing.metrics?.hip_rotation || 0) - proStandards.hip_rotation)
      },
      x_factor: {
        user: userSwing.metrics?.x_factor || 0,
        pro: proStandards.x_factor,
        difference: Math.abs((userSwing.metrics?.x_factor || 0) - proStandards.x_factor)
      }
    };

    // 유사도 계산
    const similarity = 100 - (
      comparison.shoulder_rotation.difference * 0.3 +
      comparison.hip_rotation.difference * 0.3 +
      comparison.x_factor.difference * 0.4
    );

    return {
      comparison,
      similarity: Math.max(0, Math.min(100, similarity)),
      recommendations: this.generateRecommendations(comparison)
    };
  }

  // 개선 권장사항 생성
  generateRecommendations(comparison) {
    const recommendations = [];

    if (comparison.shoulder_rotation.difference > 15) {
      recommendations.push({
        type: 'shoulder_rotation',
        message: '어깨 회전을 더 크게 하세요',
        drill: '벽 드릴로 어깨 회전 연습'
      });
    }

    if (comparison.hip_rotation.difference > 10) {
      recommendations.push({
        type: 'hip_rotation',
        message: '엉덩이 회전을 조정하세요',
        drill: '의자에 앉아 하체 회전 연습'
      });
    }

    if (comparison.x_factor.difference > 10) {
      recommendations.push({
        type: 'x_factor',
        message: 'X-Factor를 개선하세요',
        drill: '상체와 하체 분리 동작 연습'
      });
    }

    return recommendations;
  }

  // 상태 확인
  getStatus() {
    return {
      fastapi_available: this.isAvailable,
      fastapi_url: this.FASTAPI_URL,
      mode: this.isAvailable ? 'hybrid' : 'local-only'
    };
  }
}

// 싱글톤 인스턴스
const bridge = new BackendBridge();

module.exports = bridge;