// Rate Limiting 미들웨어 (Production Ready)
const logger = require('../utils/logger');

class RateLimiter {
  constructor() {
    this.clients = new Map(); // IP별 요청 추적
    this.cleanupInterval = 60 * 1000; // 1분마다 정리
    
    // 정리 작업 시작
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  // 클라이언트 정보 가져오기 또는 생성
  getClient(ip) {
    if (!this.clients.has(ip)) {
      this.clients.set(ip, {
        requests: [],
        blocked: false,
        blockUntil: 0,
        totalRequests: 0,
        firstRequest: Date.now()
      });
    }
    return this.clients.get(ip);
  }

  // Rate Limiting 규칙
  getRules(endpoint) {
    const rules = {
      // 골프 분석 API - 리소스 집약적
      '/analyze': {
        windowMs: 60 * 1000,    // 1분 윈도우
        maxRequests: 10,        // 최대 10회
        blockDurationMs: 5 * 60 * 1000, // 5분 차단
        message: '골프 분석 요청이 너무 많습니다. 5분 후 다시 시도하세요.'
      },
      
      // 일반 API
      'default': {
        windowMs: 60 * 1000,    // 1분 윈도우  
        maxRequests: 100,       // 최대 100회
        blockDurationMs: 1 * 60 * 1000, // 1분 차단
        message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.'
      },

      // Health Check - 관대함
      '/health': {
        windowMs: 60 * 1000,    // 1분 윈도우
        maxRequests: 60,        // 최대 60회 (1초에 1회)
        blockDurationMs: 10 * 1000, // 10초 차단
        message: 'Health check 요청이 너무 많습니다.'
      }
    };

    // 엔드포인트 매칭
    for (const [pattern, rule] of Object.entries(rules)) {
      if (endpoint.includes(pattern)) {
        return rule;
      }
    }
    
    return rules.default;
  }

  // Rate Limiting 체크
  checkLimit(ip, endpoint) {
    const client = this.getClient(ip);
    const rule = this.getRules(endpoint);
    const now = Date.now();

    // 차단 시간 확인
    if (client.blocked && now < client.blockUntil) {
      const remainingTime = Math.ceil((client.blockUntil - now) / 1000);
      logger.warn('Rate limit - 차단된 IP 요청', {
        ip,
        endpoint,
        remainingTime: `${remainingTime}초`,
        totalRequests: client.totalRequests
      });
      
      return {
        allowed: false,
        message: rule.message,
        retryAfter: remainingTime,
        rateLimited: true
      };
    }

    // 차단 해제
    if (client.blocked && now >= client.blockUntil) {
      client.blocked = false;
      client.blockUntil = 0;
      client.requests = [];
      logger.info('Rate limit - 차단 해제', { ip, endpoint });
    }

    // 윈도우 내 요청 필터링
    const windowStart = now - rule.windowMs;
    client.requests = client.requests.filter(time => time > windowStart);

    // 요청 수 확인
    if (client.requests.length >= rule.maxRequests) {
      // 차단 시작
      client.blocked = true;
      client.blockUntil = now + rule.blockDurationMs;
      
      logger.warn('Rate limit - IP 차단 시작', {
        ip,
        endpoint,
        requestCount: client.requests.length,
        windowMs: rule.windowMs,
        blockDurationMs: rule.blockDurationMs
      });

      return {
        allowed: false,
        message: rule.message,
        retryAfter: Math.ceil(rule.blockDurationMs / 1000),
        rateLimited: true
      };
    }

    // 요청 허용
    client.requests.push(now);
    client.totalRequests++;

    return {
      allowed: true,
      remaining: rule.maxRequests - client.requests.length,
      resetTime: new Date(windowStart + rule.windowMs),
      rateLimited: false
    };
  }

  // 만료된 클라이언트 정리
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24시간
    let cleaned = 0;

    for (const [ip, client] of this.clients.entries()) {
      // 24시간 동안 요청이 없으면 삭제
      if (now - client.firstRequest > maxAge && 
          client.requests.length === 0 && 
          !client.blocked) {
        this.clients.delete(ip);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Rate limiter cleanup: ${cleaned}개 클라이언트 정리`);
    }
  }

  // 통계 정보
  getStats() {
    const stats = {
      totalClients: this.clients.size,
      blockedClients: 0,
      topClients: []
    };

    const clientStats = [];
    for (const [ip, client] of this.clients.entries()) {
      if (client.blocked) stats.blockedClients++;
      
      clientStats.push({
        ip,
        totalRequests: client.totalRequests,
        currentRequests: client.requests.length,
        blocked: client.blocked
      });
    }

    // 요청 수 기준 상위 10개 클라이언트
    stats.topClients = clientStats
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 10);

    return stats;
  }
}

// 미들웨어 함수
const rateLimiter = new RateLimiter();

const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const endpoint = req.url;
  
  const result = rateLimiter.checkLimit(ip, endpoint);
  
  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      data: {
        score: 0,
        feedback: [result.message],
        improvements: ['잠시 후 다시 시도하세요'],
        pose: { shoulderRotation: 0, hipRotation: 0, xFactor: 0, spineAngle: 0 },
        scores: { overall: 0, posture: 0, confidence: 0, note: "Rate limit 초과" },
        processing: {
          time: "0ms",
          method: "Rate limit 차단",
          accuracy: "분석 불가",
          dataSource: "rate_limit",
          focus: "요청 제한"
        }
      },
      error: 'Too Many Requests',
      error_code: 'RATE_LIMIT_EXCEEDED',
      retry_after: result.retryAfter,
      timestamp: new Date().toISOString()
    });
  }

  // Rate limit 헤더 추가
  res.set({
    'X-RateLimit-Remaining': result.remaining,
    'X-RateLimit-Reset': result.resetTime?.toISOString()
  });

  next();
};

module.exports = {
  rateLimitMiddleware,
  getRateLimiterStats: () => rateLimiter.getStats()
};