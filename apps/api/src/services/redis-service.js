// Golf Pro API - Redis Caching Service

const Redis = require('ioredis');
const config = require('../config/env');

// Redis 클라이언트 설정
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  
  // 연결 설정
  connectTimeout: 10000,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  
  // 클러스터 설정 (필요시)
  enableReadyCheck: true,
  lazyConnect: true
});

// Redis 연결 이벤트
redis.on('connect', () => {
  console.log('✅ Redis 연결 성공');
});

redis.on('ready', () => {
  console.log('🚀 Redis 준비 완료');
});

redis.on('error', (error) => {
  console.error('❌ Redis 연결 오류:', error);
});

redis.on('close', () => {
  console.log('🔌 Redis 연결 종료');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis 재연결 중...');
});

// ===========================================
// 캐시 키 생성 헬퍼
// ===========================================
const cacheKeys = {
  user: (userId) => `user:${userId}`,
  userStats: (userId) => `user:stats:${userId}`,
  swingHistory: (userId, page = 1, limit = 20) => `swing:history:${userId}:${page}:${limit}`,
  swingTrends: (userId, days = 30) => `swing:trends:${userId}:${days}`,
  bestScores: (userId, limit = 10) => `swing:best:${userId}:${limit}`,
  challenges: (type = 'all', difficulty = 'all', page = 1) => `challenges:${type}:${difficulty}:${page}`,
  challengeLeaderboard: (challengeId, limit = 20) => `challenge:leaderboard:${challengeId}:${limit}`,
  userChallenges: (userId) => `user:challenges:${userId}`,
  analysisResult: (imageHash) => `analysis:${imageHash}`,
  rateLimitUser: (userId) => `ratelimit:user:${userId}`,
  rateLimitIP: (ip) => `ratelimit:ip:${ip}`,
  session: (sessionId) => `session:${sessionId}`,
  apiResponse: (endpoint, params) => `api:${endpoint}:${JSON.stringify(params).replace(/[^a-zA-Z0-9]/g, '')}`
};

// ===========================================
// 기본 캐시 작업
// ===========================================
const cacheService = {
  // 캐시 설정
  async set(key, value, ttlSeconds = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('Redis SET 오류:', error);
      return false;
    }
  },
  
  // 캐시 조회
  async get(key) {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Redis GET 오류:', error);
      return null;
    }
  },
  
  // 캐시 삭제
  async del(key) {
    try {
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Redis DEL 오류:', error);
      return false;
    }
  },
  
  // 패턴으로 캐시 삭제
  async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        const result = await redis.del(...keys);
        return result;
      }
      return 0;
    } catch (error) {
      console.error('Redis DEL Pattern 오류:', error);
      return 0;
    }
  },
  
  // 캐시 존재 확인
  async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS 오류:', error);
      return false;
    }
  },
  
  // TTL 설정
  async expire(key, ttlSeconds) {
    try {
      const result = await redis.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error('Redis EXPIRE 오류:', error);
      return false;
    }
  },
  
  // TTL 조회
  async ttl(key) {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error('Redis TTL 오류:', error);
      return -1;
    }
  }
};

// ===========================================
// 사용자 캐시
// ===========================================
const userCache = {
  // 사용자 정보 캐시
  async cacheUser(userId, userData) {
    const key = cacheKeys.user(userId);
    return await cacheService.set(key, userData, 3600); // 1시간
  },
  
  async getUser(userId) {
    const key = cacheKeys.user(userId);
    return await cacheService.get(key);
  },
  
  async invalidateUser(userId) {
    const pattern = `user:${userId}*`;
    return await cacheService.delPattern(pattern);
  },
  
  // 사용자 통계 캐시
  async cacheUserStats(userId, statsData) {
    const key = cacheKeys.userStats(userId);
    return await cacheService.set(key, statsData, 1800); // 30분
  },
  
  async getUserStats(userId) {
    const key = cacheKeys.userStats(userId);
    return await cacheService.get(key);
  },
  
  async invalidateUserStats(userId) {
    const key = cacheKeys.userStats(userId);
    return await cacheService.del(key);
  }
};

// ===========================================
// 스윙 분석 캐시
// ===========================================
const swingCache = {
  // 스윙 히스토리 캐시
  async cacheSwingHistory(userId, page, limit, data) {
    const key = cacheKeys.swingHistory(userId, page, limit);
    return await cacheService.set(key, data, 1800); // 30분
  },
  
  async getSwingHistory(userId, page = 1, limit = 20) {
    const key = cacheKeys.swingHistory(userId, page, limit);
    return await cacheService.get(key);
  },
  
  // 스윙 트렌드 캐시
  async cacheSwingTrends(userId, days, data) {
    const key = cacheKeys.swingTrends(userId, days);
    return await cacheService.set(key, data, 3600); // 1시간
  },
  
  async getSwingTrends(userId, days = 30) {
    const key = cacheKeys.swingTrends(userId, days);
    return await cacheService.get(key);
  },
  
  // 최고 스코어 캐시
  async cacheBestScores(userId, limit, data) {
    const key = cacheKeys.bestScores(userId, limit);
    return await cacheService.set(key, data, 3600); // 1시간
  },
  
  async getBestScores(userId, limit = 10) {
    const key = cacheKeys.bestScores(userId, limit);
    return await cacheService.get(key);
  },
  
  // 분석 결과 캐시 (이미지 해시 기반)
  async cacheAnalysisResult(imageHash, result) {
    const key = cacheKeys.analysisResult(imageHash);
    return await cacheService.set(key, result, 86400); // 24시간
  },
  
  async getAnalysisResult(imageHash) {
    const key = cacheKeys.analysisResult(imageHash);
    return await cacheService.get(key);
  },
  
  // 사용자 스윙 캐시 무효화
  async invalidateUserSwingCache(userId) {
    const patterns = [
      `swing:history:${userId}*`,
      `swing:trends:${userId}*`,
      `swing:best:${userId}*`,
      `user:stats:${userId}`
    ];
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await cacheService.delPattern(pattern);
      totalDeleted += deleted;
    }
    
    return totalDeleted;
  }
};

// ===========================================
// 챌린지 캐시
// ===========================================
const challengeCache = {
  // 활성 챌린지 캐시
  async cacheChallenges(type, difficulty, page, data) {
    const key = cacheKeys.challenges(type, difficulty, page);
    return await cacheService.set(key, data, 1800); // 30분
  },
  
  async getChallenges(type = 'all', difficulty = 'all', page = 1) {
    const key = cacheKeys.challenges(type, difficulty, page);
    return await cacheService.get(key);
  },
  
  // 챌린지 리더보드 캐시
  async cacheLeaderboard(challengeId, limit, data) {
    const key = cacheKeys.challengeLeaderboard(challengeId, limit);
    return await cacheService.set(key, data, 600); // 10분
  },
  
  async getLeaderboard(challengeId, limit = 20) {
    const key = cacheKeys.challengeLeaderboard(challengeId, limit);
    return await cacheService.get(key);
  },
  
  // 사용자 챌린지 캐시
  async cacheUserChallenges(userId, data) {
    const key = cacheKeys.userChallenges(userId);
    return await cacheService.set(key, data, 1800); // 30분
  },
  
  async getUserChallenges(userId) {
    const key = cacheKeys.userChallenges(userId);
    return await cacheService.get(key);
  },
  
  // 챌린지 캐시 무효화
  async invalidateAllChallenges() {
    const patterns = ['challenges:*', 'challenge:leaderboard:*', 'user:challenges:*'];
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await cacheService.delPattern(pattern);
      totalDeleted += deleted;
    }
    
    return totalDeleted;
  },
  
  async invalidateChallengeLeaderboard(challengeId) {
    const pattern = `challenge:leaderboard:${challengeId}*`;
    return await cacheService.delPattern(pattern);
  }
};

// ===========================================
// Rate Limiting
// ===========================================
const rateLimiter = {
  // 사용자별 요청 제한
  async checkUserRateLimit(userId, maxRequests = 100, windowSeconds = 3600) {
    const key = cacheKeys.rateLimitUser(userId);
    
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      
      const ttl = await redis.ttl(key);
      
      return {
        allowed: current <= maxRequests,
        current,
        remaining: Math.max(0, maxRequests - current),
        resetTime: Date.now() + (ttl * 1000)
      };
    } catch (error) {
      console.error('Rate Limit 체크 오류:', error);
      return { allowed: true, current: 0, remaining: maxRequests, resetTime: Date.now() + windowSeconds * 1000 };
    }
  },
  
  // IP별 요청 제한
  async checkIPRateLimit(ip, maxRequests = 1000, windowSeconds = 3600) {
    const key = cacheKeys.rateLimitIP(ip);
    
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      
      const ttl = await redis.ttl(key);
      
      return {
        allowed: current <= maxRequests,
        current,
        remaining: Math.max(0, maxRequests - current),
        resetTime: Date.now() + (ttl * 1000)
      };
    } catch (error) {
      console.error('Rate Limit 체크 오류:', error);
      return { allowed: true, current: 0, remaining: maxRequests, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }
};

// ===========================================
// 세션 관리
// ===========================================
const sessionCache = {
  // 세션 저장
  async setSession(sessionId, sessionData, ttlSeconds = 86400) { // 24시간
    const key = cacheKeys.session(sessionId);
    return await cacheService.set(key, sessionData, ttlSeconds);
  },
  
  // 세션 조회
  async getSession(sessionId) {
    const key = cacheKeys.session(sessionId);
    return await cacheService.get(key);
  },
  
  // 세션 삭제
  async deleteSession(sessionId) {
    const key = cacheKeys.session(sessionId);
    return await cacheService.del(key);
  },
  
  // 세션 갱신
  async refreshSession(sessionId, ttlSeconds = 86400) {
    const key = cacheKeys.session(sessionId);
    return await cacheService.expire(key, ttlSeconds);
  }
};

// ===========================================
// API 응답 캐시
// ===========================================
const apiResponseCache = {
  // API 응답 캐시
  async cacheResponse(endpoint, params, response, ttlSeconds = 3600) {
    const key = cacheKeys.apiResponse(endpoint, params);
    return await cacheService.set(key, response, ttlSeconds);
  },
  
  // 캐시된 응답 조회
  async getCachedResponse(endpoint, params) {
    const key = cacheKeys.apiResponse(endpoint, params);
    return await cacheService.get(key);
  },
  
  // API 응답 캐시 무효화
  async invalidateAPICache(endpoint) {
    const pattern = `api:${endpoint}*`;
    return await cacheService.delPattern(pattern);
  }
};

// ===========================================
// 캐시 통계 및 관리
// ===========================================
const cacheStats = {
  // Redis 정보 조회
  async getRedisInfo() {
    try {
      const info = await redis.info();
      const memory = await redis.info('memory');
      const stats = await redis.info('stats');
      
      return {
        connected: redis.status === 'ready',
        memory: parseRedisInfo(memory),
        stats: parseRedisInfo(stats),
        keyspace: await redis.info('keyspace')
      };
    } catch (error) {
      console.error('Redis 정보 조회 오류:', error);
      return { connected: false, error: error.message };
    }
  },
  
  // 캐시 키 통계
  async getCacheKeyStats() {
    try {
      const patterns = [
        'user:*',
        'swing:*', 
        'challenge:*',
        'analysis:*',
        'session:*',
        'ratelimit:*',
        'api:*'
      ];
      
      const stats = {};
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        const category = pattern.replace(':*', '');
        stats[category] = keys.length;
      }
      
      return stats;
    } catch (error) {
      console.error('캐시 키 통계 조회 오류:', error);
      return {};
    }
  },
  
  // 캐시 정리
  async cleanup() {
    try {
      // 만료된 키 정리
      const deletedKeys = await redis.eval(`
        local keys = redis.call('keys', '*')
        local expired = 0
        for i=1,#keys do
          local ttl = redis.call('ttl', keys[i])
          if ttl == -1 then
            redis.call('del', keys[i])
            expired = expired + 1
          end
        end
        return expired
      `, 0);
      
      return { deletedKeys };
    } catch (error) {
      console.error('캐시 정리 오류:', error);
      return { deletedKeys: 0, error: error.message };
    }
  }
};

// Redis 정보 파싱 헬퍼
function parseRedisInfo(info) {
  const result = {};
  const lines = info.split('\r\n');
  
  for (const line of lines) {
    if (line && line.includes(':') && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      result[key] = isNaN(value) ? value : parseFloat(value);
    }
  }
  
  return result;
}

// 연결 종료
const closeRedisConnection = async () => {
  try {
    await redis.disconnect();
    console.log('✅ Redis 연결 종료');
  } catch (error) {
    console.error('❌ Redis 연결 종료 오류:', error);
  }
};

// ===========================================
// Export
// ===========================================
module.exports = {
  redis,
  cacheService,
  userCache,
  swingCache,
  challengeCache,
  rateLimiter,
  sessionCache,
  apiResponseCache,
  cacheStats,
  closeRedisConnection,
  cacheKeys
};