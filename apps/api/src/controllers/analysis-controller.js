// 최적화된 분석 컨트롤러
const { analyzeGolfSwing } = require('../analyzers/local-only-analyzer');
const ImageOptimizer = require('../utils/image-optimizer');
const { analysisCache } = require('../utils/cache-manager');
const crypto = require('crypto');

class AnalysisController {
  constructor() {
    this.imageOptimizer = new ImageOptimizer();
    this.activeAnalyses = new Map();
  }

  // 이미지 해시 생성 (캐시 키용)
  createImageHash(imageData) {
    return crypto
      .createHash('md5')
      .update(imageData.substring(0, 1000)) // 앞부분만 사용
      .digest('hex');
  }

  // 스윙 분석 (캐싱 + 최적화)
  async analyzeSwing(req, res) {
    const startTime = Date.now();
    
    try {
      const { image } = req.body;
      const userId = req.userId;
      
      if (!image || image.length < 100) {
        return res.json({
          success: false,
          error: '유효한 이미지가 없습니다'
        });
      }
      
      // 캐시 키 생성
      const imageHash = this.createImageHash(image);
      const cacheKey = `analysis:${userId}:${imageHash}`;
      
      // 캐시 확인
      const cached = analysisCache.get(cacheKey);
      if (cached) {
        console.log('✅ 캐시 히트! 응답 시간:', Date.now() - startTime, 'ms');
        return res.json({
          ...cached,
          cached: true,
          processing_time: Date.now() - startTime
        });
      }
      
      // 중복 요청 방지
      if (this.activeAnalyses.has(cacheKey)) {
        console.log('⏳ 이미 처리 중인 분석입니다');
        // 기존 처리 대기
        const result = await this.activeAnalyses.get(cacheKey);
        return res.json(result);
      }
      
      // 분석 시작
      const analysisPromise = this.performAnalysis(image, userId);
      this.activeAnalyses.set(cacheKey, analysisPromise);
      
      try {
        // 이미지 최적화
        const optimized = await this.imageOptimizer.prepareForAnalysis(image);
        
        // AI 분석 실행
        const result = await analyzeGolfSwing(optimized.base64);
        
        // 결과 구조화
        const response = {
          success: true,
          data: {
            ...result,
            image_optimization: {
              original_size: image.length,
              optimized_size: optimized.base64.length,
              reduction: ((1 - optimized.base64.length / image.length) * 100).toFixed(1) + '%'
            }
          },
          processing_time: Date.now() - startTime,
          cached: false
        };
        
        // 캐시 저장 (10분)
        analysisCache.set(cacheKey, response, 10 * 60 * 1000);
        
        // 활성 분석 제거
        this.activeAnalyses.delete(cacheKey);
        
        console.log(`✅ 분석 완료: ${response.processing_time}ms`);
        return res.json(response);
        
      } catch (error) {
        this.activeAnalyses.delete(cacheKey);
        throw error;
      }
      
    } catch (error) {
      console.error('분석 오류:', error);
      return res.status(500).json({
        success: false,
        error: '분석 중 오류가 발생했습니다',
        processing_time: Date.now() - startTime
      });
    }
  }

  // 실제 분석 수행
  async performAnalysis(image, userId) {
    // 이미지 최적화
    const optimized = await this.imageOptimizer.prepareForAnalysis(image);
    
    // AI 분석
    const result = await analyzeGolfSwing(optimized.base64);
    
    return {
      success: true,
      data: result
    };
  }

  // 실시간 분석 (경량화)
  async analyzeLive(req, res) {
    const startTime = Date.now();
    
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.json({
          success: false,
          error: '이미지가 없습니다'
        });
      }
      
      // 더 작은 크기로 최적화 (실시간용)
      const optimized = await this.imageOptimizer.optimizeBase64(image);
      
      // 빠른 분석 모드
      const result = await analyzeGolfSwing(optimized.base64);
      
      // 간단한 응답
      return res.json({
        success: true,
        data: {
          score: result.score,
          phase: result.phase,
          quick_feedback: result.feedback?.priority?.[0] || '자세를 유지하세요',
          processing_time: Date.now() - startTime
        }
      });
      
    } catch (error) {
      console.error('실시간 분석 오류:', error);
      return res.json({
        success: false,
        error: '분석 실패',
        processing_time: Date.now() - startTime
      });
    }
  }

  // 배치 분석
  async analyzeBatch(req, res) {
    const startTime = Date.now();
    
    try {
      const { images } = req.body;
      const userId = req.userId;
      
      if (!images || !Array.isArray(images)) {
        return res.json({
          success: false,
          error: '이미지 배열이 필요합니다'
        });
      }
      
      const results = [];
      
      // 병렬 처리 (최대 3개씩)
      for (let i = 0; i < images.length; i += 3) {
        const batch = images.slice(i, i + 3);
        const promises = batch.map(async (img) => {
          try {
            const optimized = await this.imageOptimizer.prepareForAnalysis(img);
            return await analyzeGolfSwing(optimized.base64);
          } catch (error) {
            return { error: error.message };
          }
        });
        
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      }
      
      return res.json({
        success: true,
        data: {
          total: images.length,
          successful: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length,
          results: results
        },
        processing_time: Date.now() - startTime
      });
      
    } catch (error) {
      console.error('배치 분석 오류:', error);
      return res.status(500).json({
        success: false,
        error: '배치 분석 실패',
        processing_time: Date.now() - startTime
      });
    }
  }

  // 캐시 상태
  getCacheStatus(req, res) {
    const stats = analysisCache.getStats();
    
    res.json({
      success: true,
      cache: stats,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  }

  // 캐시 초기화
  clearCache(req, res) {
    const cleared = analysisCache.clear();
    
    res.json({
      success: true,
      message: `${cleared}개의 캐시 항목이 삭제되었습니다`
    });
  }
}

module.exports = new AnalysisController();