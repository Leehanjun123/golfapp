// 메모리 기반 캐시 시스템 (Redis 없이)
class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.options = {
      maxSize: options.maxSize || 100,        // 최대 항목 수
      ttl: options.ttl || 5 * 60 * 1000,      // 5분 기본 TTL
      checkPeriod: options.checkPeriod || 60 * 1000, // 1분마다 정리
      ...options
    };
    
    // 통계
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // 정기적인 정리 시작
    this.startCleanup();
  }

  // 캐시 키 생성
  createKey(...args) {
    return args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg);
      }
      return String(arg);
    }).join(':');
  }

  // 캐시 저장
  set(key, value, ttl = this.options.ttl) {
    try {
      // 크기 제한 체크
      if (this.cache.size >= this.options.maxSize) {
        this.evictOldest();
      }
      
      const expiry = Date.now() + ttl;
      this.cache.set(key, {
        value,
        expiry,
        created: Date.now(),
        accessCount: 0
      });
      
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('캐시 저장 오류:', error);
      return false;
    }
  }

  // 캐시 조회
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // 만료 체크
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // 접근 카운트 증가
    item.accessCount++;
    item.lastAccess = Date.now();
    
    this.stats.hits++;
    return item.value;
  }

  // 캐시 또는 실행
  async getOrSet(key, fetchFunction, ttl = this.options.ttl) {
    // 캐시에서 먼저 확인
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // 없으면 함수 실행하고 저장
    try {
      const value = await fetchFunction();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      console.error('캐시 또는 실행 오류:', error);
      throw error;
    }
  }

  // 캐시 삭제
  delete(key) {
    const result = this.cache.delete(key);
    if (result) {
      this.stats.deletes++;
    }
    return result;
  }

  // 패턴으로 삭제
  deletePattern(pattern) {
    const regex = new RegExp(pattern);
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    this.stats.deletes += count;
    return count;
  }

  // 캐시 비우기
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    return size;
  }

  // 가장 오래된 항목 제거
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.created < oldestTime) {
        oldestTime = item.created;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  // LRU (Least Recently Used) 제거
  evictLRU() {
    let lruKey = null;
    let lruTime = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      const lastAccess = item.lastAccess || item.created;
      if (lastAccess < lruTime) {
        lruTime = lastAccess;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  // 만료된 항목 정리
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 캐시 정리: ${cleaned}개 항목 제거`);
    }
    
    return cleaned;
  }

  // 정기 정리 시작
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.checkPeriod);
  }

  // 정리 중지
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // 캐시 통계
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: `${hitRate}%`,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // 메모리 사용량 추정
  estimateMemoryUsage() {
    let totalBytes = 0;
    
    for (const [key, item] of this.cache.entries()) {
      // 키 크기
      totalBytes += key.length * 2; // UTF-16
      
      // 값 크기 (대략적)
      const valueStr = JSON.stringify(item.value);
      totalBytes += valueStr.length * 2;
      
      // 메타데이터
      totalBytes += 100; // 대략적인 오버헤드
    }
    
    return {
      bytes: totalBytes,
      kb: (totalBytes / 1024).toFixed(2),
      mb: (totalBytes / 1024 / 1024).toFixed(2)
    };
  }

  // 디버그 정보
  debug() {
    console.log('=== 캐시 디버그 정보 ===');
    console.log('통계:', this.getStats());
    console.log('항목 수:', this.cache.size);
    
    const items = [];
    for (const [key, item] of this.cache.entries()) {
      items.push({
        key,
        expiry: new Date(item.expiry).toISOString(),
        accessCount: item.accessCount,
        age: Date.now() - item.created
      });
    }
    
    console.table(items.slice(0, 10)); // 상위 10개만
  }
}

// 싱글톤 인스턴스 생성
const analysisCache = new CacheManager({
  maxSize: 50,
  ttl: 10 * 60 * 1000, // 10분
  checkPeriod: 2 * 60 * 1000 // 2분마다 정리
});

const userCache = new CacheManager({
  maxSize: 100,
  ttl: 30 * 60 * 1000, // 30분
  checkPeriod: 5 * 60 * 1000 // 5분마다 정리
});

module.exports = {
  CacheManager,
  analysisCache,
  userCache
};