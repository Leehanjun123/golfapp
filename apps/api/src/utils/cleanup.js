// 메모리 정리 유틸리티
const v8 = require('v8');

// 정기적인 메모리 정리
class MemoryCleaner {
  constructor() {
    this.interval = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // 10초마다 메모리 체크 및 정리 (더 자주)
    this.interval = setInterval(() => {
      this.cleanup();
    }, 10000);

    console.log('🧹 메모리 자동 정리 시작');
    
    // 시작하자마자 한 번 정리
    this.cleanup();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      console.log('🧹 메모리 자동 정리 중지');
    }
  }

  cleanup() {
    const memBefore = process.memoryUsage();
    
    // 가비지 컬렉션 실행
    if (global.gc) {
      global.gc();
    }
    
    // V8 힙 압축
    v8.setFlagsFromString('--gc_global');
    
    const memAfter = process.memoryUsage();
    const freed = (memBefore.heapUsed - memAfter.heapUsed) / 1024 / 1024;
    
    if (freed > 10) {
      console.log(`♻️ 메모리 ${freed.toFixed(1)}MB 해제됨`);
    }
    
    // 메모리 사용량이 높으면 경고 (더 낮은 임계값)
    const usage = memAfter.heapUsed / memAfter.heapTotal;
    if (usage > 0.6) {  // 60%부터 정리 시작
      console.warn(`⚠️ 메모리 사용량 높음: ${(usage * 100).toFixed(1)}%`);
      this.aggressiveCleanup();
    }
  }

  aggressiveCleanup() {
    // 캐시 정리
    if (global.analysisCache) {
      global.analysisCache.clear();
    }
    
    // 이미지 버퍼 정리
    if (global.imageBuffers) {
      global.imageBuffers = [];
    }
    
    // TensorFlow 메모리 정리
    if (global.tf) {
      global.tf.disposeVariables();
    }
    
    // 가벼운 GC (성능 최적화)
    if (global.gc && Math.random() < 0.3) { // 30% 확률로만 실행
      global.gc();
    }
    
    console.log('♻️ 메모리 정리 완료');
  }
}

// 프로세스 종료 시 정리
process.on('exit', () => {
  if (global.gc) {
    global.gc();
  }
});

// 처리되지 않은 Promise 정리
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // 메모리 정리
  if (global.gc) {
    global.gc();
  }
});

module.exports = new MemoryCleaner();