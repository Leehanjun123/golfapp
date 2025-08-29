// 스마트 캐싱 시스템 - LRU + TTL + 압축
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class SmartCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;        // 최대 항목 수
    this.maxMemory = options.maxMemory || 50;     // 최대 메모리 (MB)
    this.ttl = options.ttl || 5 * 60 * 1000;      // 기본 TTL: 5분
    this.compress = options.compress !== false;    // 압축 사용
    
    this.cache = new Map();
    this.accessOrder = [];
    this.memoryUsage = 0;
    
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      compressionSaved: 0
    };
    
    // 주기적 정리
    setInterval(() => this.cleanup(), 60000); // 1분마다
  }
  
  // 캐시 키 생성
  generateKey(data) {
    if (typeof data === 'string') {
      return crypto.createHash('sha256').update(data).digest('hex');
    }
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
  
  // 데이터 압축
  async compressData(data) {
    if (!this.compress) return data;
    
    const json = JSON.stringify(data);
    const compressed = await gzip(json);
    
    // 압축률 계산
    const originalSize = Buffer.byteLength(json);
    const compressedSize = compressed.length;
    this.stats.compressionSaved += (originalSize - compressedSize);
    
    return {
      compressed: true,
      data: compressed.toString('base64'),
      originalSize,
      compressedSize
    };
  }
  
  // 데이터 압축 해제
  async decompressData(entry) {
    if (!entry.compressed) return entry;
    
    const buffer = Buffer.from(entry.data, 'base64');
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString());
  }
  
  // 캐시 설정
  async set(key, value, ttl = this.ttl) {
    // 키 생성
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    
    // 데이터 압축
    const compressed = await this.compressData(value);
    
    // 메모리 크기 계산
    const size = this.calculateSize(compressed);
    
    // 메모리 제한 확인
    while (this.memoryUsage + size > this.maxMemory * 1024 * 1024) {
      this.evictLRU();
    }
    
    // 크기 제한 확인
    while (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    // 캐시 저장
    const entry = {
      data: compressed,
      size,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };
    
    this.cache.set(cacheKey, entry);
    this.memoryUsage += size;
    
    // 접근 순서 업데이트
    this.updateAccessOrder(cacheKey);
    
    return cacheKey;
  }
  
  // 캐시 조회
  async get(key) {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // 만료 확인
    if (Date.now() > entry.expiresAt) {
      this.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    // 통계 업데이트
    this.stats.hits++;
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // 접근 순서 업데이트
    this.updateAccessOrder(cacheKey);
    
    // 압축 해제 및 반환
    return await this.decompressData(entry.data);
  }
  
  // 캐시 삭제
  delete(key) {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    
    const entry = this.cache.get(cacheKey);
    if (entry) {
      this.memoryUsage -= entry.size;
      this.cache.delete(cacheKey);
      
      // 접근 순서에서 제거
      const index = this.accessOrder.indexOf(cacheKey);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }
  
  // LRU 제거
  evictLRU() {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder.shift();
    this.delete(lruKey);
    this.stats.evictions++;
  }
  
  // 접근 순서 업데이트
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
  
  // 크기 계산
  calculateSize(data) {
    if (typeof data === 'string') {
      return Buffer.byteLength(data);
    } else if (Buffer.isBuffer(data)) {
      return data.length;
    } else if (data.compressedSize) {
      return data.compressedSize;
    } else {
      return Buffer.byteLength(JSON.stringify(data));
    }
  }
  
  // 정리
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 캐시 정리: ${cleaned}개 만료 항목 제거`);
    }
  }
  
  // 캐시 비우기
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.memoryUsage = 0;
  }
  
  // 통계
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;
    
    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      size: this.cache.size,
      memoryUsage: (this.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
      compressionSaved: (this.stats.compressionSaved / 1024 / 1024).toFixed(2) + 'MB'
    };
  }
  
  // 캐시 워밍
  async warm(entries) {
    console.log(`🔥 캐시 워밍 시작: ${entries.length}개 항목`);
    
    for (const { key, value, ttl } of entries) {
      await this.set(key, value, ttl);
    }
    
    console.log(`✅ 캐시 워밍 완료`);
  }
  
  // 가장 자주 접근한 항목
  getMostAccessed(limit = 10) {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed).toISOString()
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
    
    return entries;
  }
}

// 기본 캐시 인스턴스
const analysisCache = new SmartCache({
  maxSize: 50,
  maxMemory: 30,  // 30MB
  ttl: 10 * 60 * 1000,  // 10분
  compress: true
});

module.exports = { SmartCache, analysisCache };