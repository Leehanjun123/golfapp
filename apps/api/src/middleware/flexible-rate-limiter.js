// 유연한 Rate Limiting 미들웨어
const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

// 환경별 설정
const ENV_CONFIGS = {
  production: {
    windowMs: 1 * 60 * 1000, // 1분
    max: 100, // 분당 100 요청
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  staging: {
    windowMs: 1 * 60 * 1000,
    max: 200,
    skipSuccessfulRequests: false,
    skipFailedRequests: true
  },
  development: {
    windowMs: 1 * 60 * 1000,
    max: 1000, // 개발 환경은 관대하게
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },
  test: {
    windowMs: 1 * 60 * 1000,
    max: 10000, // 테스트는 제한 없이
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  }
};

// 화이트리스트 (Rate limiting 제외)
const WHITELIST = [
  '127.0.0.1',
  'localhost',
  '::1',
  '::ffff:127.0.0.1'
];

// 동적 Rate Limiting
class FlexibleRateLimiter {
  constructor() {
    this.limiters = new Map();
    this.blocked = new Map();
    this.stats = {
      requests: 0,
      blocked: 0,
      passed: 0
    };
    
    // 기본 설정
    this.env = process.env.NODE_ENV || 'development';
    this.config = ENV_CONFIGS[this.env];
  }
  
  // 엔드포인트별 Rate Limiter 생성
  createLimiter(endpoint, customConfig = {}) {
    const config = {
      ...this.config,
      ...customConfig,
      keyGenerator: (req) => {
        // IP 추출
        const ip = req.ip || req.connection.remoteAddress;
        
        // 화이트리스트 체크
        if (WHITELIST.includes(ip)) {
          return 'whitelist'; // 무제한
        }
        
        // 사용자 ID가 있으면 사용
        if (req.user && req.user.id) {
          return `user_${req.user.id}`;
        }
        
        return ip;
      },
      handler: (req, res) => {
        this.stats.blocked++;
        
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.ceil(config.windowMs / 1000),
          message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
        });
      },
      onLimitReached: (req) => {
        const ip = req.ip || req.connection.remoteAddress;
        console.log(`⚠️ Rate limit reached: ${ip} on ${endpoint}`);
      }
    };
    
    // 프로덕션에서는 MongoDB 사용
    if (this.env === 'production' && process.env.MONGODB_URI) {
      config.store = new MongoStore({
        uri: process.env.MONGODB_URI,
        collectionName: 'rate_limits',
        expireTimeMs: config.windowMs
      });
    }
    
    return rateLimit(config);
  }
  
  // 글로벌 미들웨어
  global() {
    return this.createLimiter('global', {
      max: this.env === 'production' ? 100 : 1000
    });
  }
  
  // API 엔드포인트용
  api() {
    return this.createLimiter('api', {
      max: this.env === 'production' ? 60 : 500,
      windowMs: 1 * 60 * 1000
    });
  }
  
  // 인증 엔드포인트용 (더 엄격)
  auth() {
    return this.createLimiter('auth', {
      max: 5, // 5회 시도
      windowMs: 15 * 60 * 1000, // 15분
      skipSuccessfulRequests: true // 성공하면 카운트 안함
    });
  }
  
  // 분석 엔드포인트용
  analyze() {
    return this.createLimiter('analyze', {
      max: this.env === 'production' ? 30 : 200,
      windowMs: 1 * 60 * 1000,
      message: 'AI 분석 요청이 너무 많습니다. 1분 후 다시 시도해주세요.'
    });
  }
  
  // 부하 테스트용 (일시적 해제)
  loadTest() {
    return (req, res, next) => {
      // 부하 테스트 토큰 확인
      if (req.headers['x-load-test-token'] === process.env.LOAD_TEST_TOKEN) {
        return next();
      }
      
      // 일반 Rate limiting 적용
      return this.api()(req, res, next);
    };
  }
  
  // 통계
  getStats() {
    return {
      ...this.stats,
      environment: this.env,
      config: this.config,
      activeLimiters: this.limiters.size,
      blockedIPs: this.blocked.size
    };
  }
  
  // Rate limit 초기화 (테스트용)
  reset() {
    this.limiters.clear();
    this.blocked.clear();
    this.stats = {
      requests: 0,
      blocked: 0,
      passed: 0
    };
  }
  
  // IP 차단 해제
  unblock(ip) {
    return this.blocked.delete(ip);
  }
  
  // 동적 설정 변경
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
}

// 싱글톤 인스턴스
const flexibleRateLimiter = new FlexibleRateLimiter();

module.exports = flexibleRateLimiter;