// 메모리 최적화 유틸리티
const v8 = require('v8');
const { performance } = require('perf_hooks');

class MemoryOptimizer {
  constructor() {
    this.pythonProcesses = new Map();
    this.maxProcessAge = 5 * 60 * 1000; // 5분
    this.maxCacheSize = 100; // 최대 캐시 항목 수
    this.caches = new Map();
    
    // 주기적 정리
    setInterval(() => this.cleanup(), 30000); // 30초마다
    
    // 가비지 컬렉션 강제 실행 (프로덕션에서만)
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        if (global.gc) {
          global.gc();
        }
      }, 60000); // 1분마다
    }
  }
  
  // Python 프로세스 관리
  registerPythonProcess(id, process) {
    this.pythonProcesses.set(id, {
      process,
      createdAt: Date.now(),
      lastUsed: Date.now()
    });
  }
  
  cleanupPythonProcesses() {
    const now = Date.now();
    for (const [id, info] of this.pythonProcesses.entries()) {
      if (now - info.lastUsed > this.maxProcessAge) {
        try {
          info.process.kill();
          this.pythonProcesses.delete(id);
          console.log(`✅ Python 프로세스 정리: ${id}`);
        } catch (error) {
          console.error(`Python 프로세스 정리 실패: ${id}`, error);
        }
      }
    }
  }
  
  // 캐시 크기 제한
  limitCacheSize(cacheName, cache) {
    if (cache.size > this.maxCacheSize) {
      const entriesToDelete = cache.size - this.maxCacheSize;
      const keys = Array.from(cache.keys());
      
      for (let i = 0; i < entriesToDelete; i++) {
        cache.delete(keys[i]);
      }
      
      console.log(`📦 캐시 정리: ${cacheName} (${entriesToDelete}개 항목 삭제)`);
    }
  }
  
  // 메모리 스냅샷
  getMemorySnapshot() {
    const heapStats = v8.getHeapStatistics();
    const memUsage = process.memoryUsage();
    
    return {
      heap: {
        used: Math.round(heapStats.used_heap_size / 1024 / 1024),
        total: Math.round(heapStats.total_heap_size / 1024 / 1024),
        limit: Math.round(heapStats.heap_size_limit / 1024 / 1024),
        usage: Math.round((heapStats.used_heap_size / heapStats.heap_size_limit) * 100)
      },
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024)
    };
  }
  
  // 메모리 압박 감지
  isMemoryPressure() {
    const snapshot = this.getMemorySnapshot();
    return snapshot.heap.usage > 70; // 70% 이상 사용시
  }
  
  // 긴급 메모리 정리
  emergencyCleanup() {
    console.log('🚨 긴급 메모리 정리 시작');
    
    // 모든 캐시 비우기
    for (const [name, cache] of this.caches.entries()) {
      cache.clear();
      console.log(`  - ${name} 캐시 비움`);
    }
    
    // 오래된 Python 프로세스 종료
    for (const [id, info] of this.pythonProcesses.entries()) {
      try {
        info.process.kill();
        this.pythonProcesses.delete(id);
      } catch (error) {
        // 무시
      }
    }
    
    // 가비지 컬렉션 강제 실행
    if (global.gc) {
      global.gc();
      global.gc(); // 두 번 실행으로 더 철저히
    }
    
    const afterSnapshot = this.getMemorySnapshot();
    console.log(`✅ 메모리 정리 완료: ${afterSnapshot.heap.usage}% 사용 중`);
  }
  
  // 주기적 정리
  cleanup() {
    const snapshot = this.getMemorySnapshot();
    
    if (snapshot.heap.usage > 80) {
      this.emergencyCleanup();
    } else if (snapshot.heap.usage > 70) {
      this.cleanupPythonProcesses();
      
      // 캐시 크기 제한
      for (const [name, cache] of this.caches.entries()) {
        this.limitCacheSize(name, cache);
      }
    }
  }
  
  // 캐시 등록
  registerCache(name, cache) {
    this.caches.set(name, cache);
  }
  
  // 성능 측정
  measurePerformance(fn, label) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (duration > 100) {
      console.log(`⚠️ 느린 작업 감지: ${label} (${duration.toFixed(2)}ms)`);
    }
    
    return result;
  }
}

// 싱글톤 인스턴스
const memoryOptimizer = new MemoryOptimizer();

// 프로세스 종료시 정리
process.on('exit', () => {
  for (const [id, info] of memoryOptimizer.pythonProcesses.entries()) {
    try {
      info.process.kill();
    } catch (error) {
      // 무시
    }
  }
});

module.exports = memoryOptimizer;