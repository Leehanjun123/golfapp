// 요청 검증 미들웨어 (Production Ready)
const logger = require('../utils/logger');

class RequestValidator {
  // Base64 이미지 검증
  static validateBase64Image(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      return { valid: false, error: '이미지 데이터가 필요합니다' };
    }

    // Base64 형식 검증 - 더 유연하게 수정
    const base64Regex = /^[A-Za-z0-9+/\r\n]*={0,2}$/;
    let cleanBase64 = base64String;
    
    // Data URL 형식인 경우 처리
    if (base64String.startsWith('data:')) {
      const commaIndex = base64String.indexOf(',');
      if (commaIndex === -1) {
        return { valid: false, error: '잘못된 Data URL 형식입니다' };
      }
      cleanBase64 = base64String.substring(commaIndex + 1);
    }
    
    // 줄바꿈 제거
    cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

    // Base64 유효성 검증
    if (!base64Regex.test(cleanBase64)) {
      return { valid: false, error: '잘못된 Base64 형식입니다' };
    }

    // 크기 검증 (최대 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const estimatedSize = (cleanBase64.length * 3) / 4;
    
    if (estimatedSize > maxSize) {
      return { 
        valid: false, 
        error: `이미지가 너무 큽니다. 최대 ${maxSize / 1024 / 1024}MB까지 가능합니다` 
      };
    }

    // 최소 크기 검증 (100 bytes)
    if (estimatedSize < 100) {
      return { valid: false, error: '이미지가 너무 작습니다' };
    }

    return { valid: true, size: estimatedSize };
  }

  // 골프 분석 요청 검증
  static validateGolfAnalysisRequest(req, res, next) {
    const { image, video } = req.body;
    const mediaData = image || video;

    // 미디어 데이터 존재 확인
    if (!mediaData) {
      logger.warn('골프 분석 요청 검증 실패: 미디어 데이터 없음', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: Object.keys(req.body)
      });

      return res.status(400).json({
        success: false,
        data: {
          score: 0,
          feedback: ['이미지 또는 비디오 데이터가 필요합니다'],
          improvements: ['유효한 이미지를 업로드하세요'],
          pose: { shoulderRotation: 0, hipRotation: 0, xFactor: 0, spineAngle: 0 },
          scores: { overall: 0, posture: 0, confidence: 0, note: "데이터 검증 실패" },
          processing: {
            time: "0ms",
            method: "요청 검증 실패",
            accuracy: "분석 불가",
            dataSource: "validation_error",
            focus: "유효한 데이터 필요"
          }
        },
        error: 'Missing media data',
        error_code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    // Base64 이미지 검증
    const validation = RequestValidator.validateBase64Image(mediaData);
    if (!validation.valid) {
      logger.warn('골프 분석 요청 검증 실패: Base64 검증', {
        ip: req.ip,
        error: validation.error,
        dataLength: mediaData.length
      });

      return res.status(400).json({
        success: false,
        data: {
          score: 0,
          feedback: [validation.error],
          improvements: ['올바른 형식의 이미지를 업로드하세요'],
          pose: { shoulderRotation: 0, hipRotation: 0, xFactor: 0, spineAngle: 0 },
          scores: { overall: 0, posture: 0, confidence: 0, note: "이미지 검증 실패" },
          processing: {
            time: "0ms",
            method: "이미지 검증 실패",
            accuracy: "분석 불가",
            dataSource: "validation_error",
            focus: "유효한 이미지 필요"
          }
        },
        error: validation.error,
        error_code: 'IMAGE_VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    // 검증 성공 - 메타데이터 추가
    req.validatedMedia = {
      data: mediaData,
      size: validation.size,
      type: image ? 'image' : 'video'
    };

    logger.debug('골프 분석 요청 검증 성공', {
      ip: req.ip,
      mediaType: req.validatedMedia.type,
      mediaSize: req.validatedMedia.size
    });

    next();
  }

  // 일반 요청 보안 검증
  static securityValidation(req, res, next) {
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,  // XSS 시도
      /javascript:/gi,                  // JavaScript URL
      /vbscript:/gi,                   // VBScript URL
      /on\w+\s*=/gi,                   // Event handlers
      /\.\./gi,                        // Directory traversal
      /union\s+select/gi,              // SQL Injection
      /drop\s+table/gi,                // SQL Injection
    ];

    const requestData = JSON.stringify(req.body) + req.url + (req.get('User-Agent') || '');
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        logger.warn('보안 위협 탐지', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          pattern: pattern.toString(),
          suspiciousData: requestData.substring(0, 200)
        });

        return res.status(403).json({
          success: false,
          error: 'Forbidden request detected',
          error_code: 'SECURITY_VIOLATION',
          timestamp: new Date().toISOString()
        });
      }
    }

    next();
  }

  // Content-Type 검증
  static contentTypeValidation(req, res, next) {
    if (req.method === 'POST' && 
        !req.is('application/json') && 
        !req.is('multipart/form-data')) {
      
      logger.warn('잘못된 Content-Type', {
        ip: req.ip,
        contentType: req.get('Content-Type'),
        url: req.url
      });

      return res.status(415).json({
        success: false,
        error: 'Unsupported Media Type. Use application/json',
        error_code: 'UNSUPPORTED_MEDIA_TYPE',
        timestamp: new Date().toISOString()
      });
    }

    next();
  }
}

module.exports = RequestValidator;