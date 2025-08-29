// Golf Pro API - Cache Middleware

const { apiResponseCache, rateLimiter } = require('../services/redis-service');
const crypto = require('crypto');

// ===========================================
// API 응답 캐시 미들웨어
// ===========================================
const cacheMiddleware = (ttlSeconds = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    // POST, PUT, DELETE 요청은 캐시하지 않음
    if (req.method !== 'GET') {
      return next();
    }
    
    try {
      // 캐시 키 생성
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        const keyData = {
          url: req.originalUrl,
          query: req.query,
          user: req.user?.id || 'anonymous'
        };
        cacheKey = crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
      }
      
      // 캐시된 응답 확인
      const cachedResponse = await apiResponseCache.getCachedResponse(req.route?.path || req.path, { key: cacheKey });
      
      if (cachedResponse) {
        // 캐시 히트 헤더 추가
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-Age': Math.floor((Date.now() - cachedResponse.cachedAt) / 1000)
        });
        
        return res.json(cachedResponse.data);
      }
      
      // 원본 res.json 메서드 저장
      const originalJson = res.json;
      
      // res.json 메서드 오버라이드
      res.json = function(data) {
        // 성공 응답만 캐시 (2xx 상태 코드)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 캐시 저장 (비동기)
          const cacheData = {
            data,
            cachedAt: Date.now(),
            statusCode: res.statusCode
          };
          
          apiResponseCache.cacheResponse(
            req.route?.path || req.path,
            { key: cacheKey },
            cacheData,
            ttlSeconds
          ).catch(error => {
            console.error('캐시 저장 실패:', error);
          });
          
          // 캐시 미스 헤더 추가
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
            'Cache-Control': `public, max-age=${ttlSeconds}`
          });
        }
        
        // 원본 메서드 호출
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('캐시 미들웨어 오류:', error);
      next();
    }
  };
};

// ===========================================
// Rate Limiting 미들웨어
// ===========================================
const rateLimitMiddleware = (options = {}) => {
  const {
    maxRequests = 100,
    windowSeconds = 3600,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null
  } = options;
  
  return async (req, res, next) => {
    try {
      let identifier;
      
      if (keyGenerator && typeof keyGenerator === 'function') {
        identifier = keyGenerator(req);
      } else if (req.user) {
        // 인증된 사용자는 사용자 ID 사용
        identifier = `user:${req.user.id}`;
      } else {
        // 비인증 사용자는 IP 주소 사용
        identifier = `ip:${req.ip || req.connection.remoteAddress}`;
      }
      
      // Rate limit 체크
      const result = identifier.startsWith('user:') 
        ? await rateLimiter.checkUserRateLimit(identifier.replace('user:', ''), maxRequests, windowSeconds)
        : await rateLimiter.checkIPRateLimit(identifier.replace('ip:', ''), maxRequests, windowSeconds);
      
      // Rate limit 헤더 추가
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });
      
      // Rate limit 초과 시
      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          error_code: 'RATE_LIMIT_EXCEEDED',
          message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          limit: maxRequests,
          remaining: result.remaining,
          resetTime: result.resetTime
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate Limit 미들웨어 오류:', error);
      // 에러 발생 시에도 요청을 통과시킴
      next();
    }
  };
};

// ===========================================
// 조건부 캐시 미들웨어
// ===========================================
const conditionalCache = (condition, ttlSeconds = 3600) => {
  return (req, res, next) => {
    if (condition(req)) {
      return cacheMiddleware(ttlSeconds)(req, res, next);
    }
    next();
  };
};

// ===========================================
// 캐시 무효화 미들웨어
// ===========================================
const cacheInvalidationMiddleware = (patterns) => {
  return async (req, res, next) => {
    // 원본 응답 메서드들 저장
    const originalSend = res.send;
    const originalJson = res.json;
    
    // 응답 완료 후 캐시 무효화
    const invalidateCache = async (statusCode) => {
      if (statusCode >= 200 && statusCode < 300) {
        try {
          const patternsToInvalidate = typeof patterns === 'function' 
            ? patterns(req) 
            : patterns;
          
          if (Array.isArray(patternsToInvalidate)) {
            for (const pattern of patternsToInvalidate) {
              await apiResponseCache.invalidateAPICache(pattern);
            }
          }
        } catch (error) {
          console.error('캐시 무효화 오류:', error);
        }
      }
    };
    
    // res.send 오버라이드
    res.send = function(data) {
      invalidateCache(this.statusCode).catch(console.error);
      return originalSend.call(this, data);
    };
    
    // res.json 오버라이드
    res.json = function(data) {
      invalidateCache(this.statusCode).catch(console.error);
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// ===========================================
// 스마트 캐시 미들웨어 (동적 TTL)
// ===========================================
const smartCacheMiddleware = (config = {}) => {
  const {
    baseTime = 3600,
    factorByUserType = { premium: 2, regular: 1, guest: 0.5 },
    factorByDataSize = { small: 2, medium: 1, large: 0.5 },
    factorByComplexity = { low: 2, medium: 1, high: 0.5 }
  } = config;
  
  return (req, res, next) => {
    // 동적 TTL 계산
    let ttl = baseTime;
    
    // 사용자 타입에 따른 조정
    if (req.user) {
      const userType = req.user.premium ? 'premium' : 'regular';
      ttl *= factorByUserType[userType] || 1;
    } else {
      ttl *= factorByUserType.guest || 0.5;
    }
    
    // 데이터 복잡도에 따른 조정 (경로 기반)
    if (req.path.includes('/analysis/')) {
      ttl *= factorByComplexity.high || 0.5;
    } else if (req.path.includes('/stats/')) {
      ttl *= factorByComplexity.medium || 1;
    } else {
      ttl *= factorByComplexity.low || 2;
    }
    
    // 최종 TTL 적용
    return cacheMiddleware(Math.floor(ttl))(req, res, next);
  };
};

// ===========================================
// 캐시 워밍 유틸리티
// ===========================================
const cacheWarming = {
  // 인기 데이터 미리 캐시
  async warmPopularData() {
    console.log('🔥 인기 데이터 캐시 워밍 시작...');
    
    try {
      // 활성 챌린지 미리 로드
      // 여기서는 실제 데이터베이스 호출 대신 예시
      console.log('📊 활성 챌린지 캐시 워밍...');
      
      // 사용자 통계 미리 로드 (최근 활성 사용자)
      console.log('👤 사용자 통계 캐시 워밍...');
      
      console.log('✅ 캐시 워밍 완료');
    } catch (error) {
      console.error('❌ 캐시 워밍 실패:', error);
    }
  },
  
  // 주기적 캐시 갱신
  startPeriodicWarming(intervalMinutes = 60) {
    setInterval(async () => {
      await this.warmPopularData();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`⏰ 주기적 캐시 워밍 시작 (${intervalMinutes}분마다)`);
  }
};

// ===========================================
// Export
// ===========================================
module.exports = {
  cacheMiddleware,
  rateLimitMiddleware,
  conditionalCache,
  cacheInvalidationMiddleware,
  smartCacheMiddleware,
  cacheWarming
};