/**
 * 카메라 촬영 전 검증 서비스
 * 촬영 환경과 조건을 사전 체크
 */

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
}

class CameraValidationService {
  /**
   * 촬영 전 환경 체크
   */
  validateBeforeCapture(): ValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // 시간대 체크 (낮 시간 권장)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 18) {
      warnings.push('조명이 부족할 수 있습니다');
      recommendations.push('충분한 조명을 확보하세요');
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      recommendations: [
        '전신이 보이도록 2-3m 거리 유지',
        '측면 45도 각도에서 촬영',
        '골프채를 들고 어드레스 자세',
        ...recommendations
      ]
    };
  }

  /**
   * 촬영된 이미지 사전 검증
   */
  validateCapturedImage(imageBase64: string): {
    isValid: boolean;
    message: string;
    quality: number;
  } {
    // 이미지 크기 체크
    const imageSizeKB = (imageBase64.length * 0.75) / 1024;
    
    if (imageSizeKB < 50) {
      return {
        isValid: false,
        message: '이미지 품질이 너무 낮습니다',
        quality: 0
      };
    }
    
    if (imageSizeKB > 5000) {
      return {
        isValid: true,
        message: '고화질 이미지입니다',
        quality: 100
      };
    }
    
    const quality = Math.min((imageSizeKB / 500) * 100, 100);
    
    return {
      isValid: true,
      message: '분석 가능한 이미지입니다',
      quality: Math.round(quality)
    };
  }
}

export default new CameraValidationService();