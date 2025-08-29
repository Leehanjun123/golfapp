// 요청 큐 관리자 - 동시성 제어
const EventEmitter = require('events');

class RequestQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxConcurrent = options.maxConcurrent || 10; // 최대 동시 처리 수
    this.maxQueueSize = options.maxQueueSize || 100; // 최대 대기열 크기
    this.timeout = options.timeout || 30000; // 30초 타임아웃
    
    this.queue = [];
    this.processing = new Map();
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      rejectedRequests: 0,
      avgProcessingTime: 0
    };
    
    // 처리 시간 추적
    this.processingTimes = [];
    this.maxProcessingTimeSamples = 100;
  }
  
  // 요청 추가
  async enqueue(requestId, processor) {
    this.stats.totalRequests++;
    
    // 대기열 크기 확인
    if (this.queue.length >= this.maxQueueSize) {
      this.stats.rejectedRequests++;
      throw new Error('Request queue is full');
    }
    
    return new Promise((resolve, reject) => {
      const request = {
        id: requestId,
        processor,
        resolve,
        reject,
        enqueuedAt: Date.now(),
        timeoutId: null
      };
      
      // 타임아웃 설정
      request.timeoutId = setTimeout(() => {
        this.handleTimeout(request);
      }, this.timeout);
      
      this.queue.push(request);
      this.processNext();
    });
  }
  
  // 다음 요청 처리
  async processNext() {
    // 동시 처리 한계 확인
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }
    
    // 대기 중인 요청 가져오기
    const request = this.queue.shift();
    if (!request) {
      return;
    }
    
    // 처리 시작
    this.processing.set(request.id, request);
    const startTime = Date.now();
    
    try {
      const result = await request.processor();
      
      // 타임아웃 해제
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      
      // 처리 시간 기록
      const processingTime = Date.now() - startTime;
      this.recordProcessingTime(processingTime);
      
      // 완료
      this.stats.completedRequests++;
      request.resolve(result);
      
    } catch (error) {
      this.stats.failedRequests++;
      request.reject(error);
      
    } finally {
      this.processing.delete(request.id);
      
      // 다음 요청 처리
      setImmediate(() => this.processNext());
    }
  }
  
  // 타임아웃 처리
  handleTimeout(request) {
    this.stats.timeoutRequests++;
    
    // 대기열에서 제거
    const queueIndex = this.queue.indexOf(request);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }
    
    // 처리 중에서 제거
    this.processing.delete(request.id);
    
    request.reject(new Error('Request timeout'));
  }
  
  // 처리 시간 기록
  recordProcessingTime(time) {
    this.processingTimes.push(time);
    
    // 샘플 크기 제한
    if (this.processingTimes.length > this.maxProcessingTimeSamples) {
      this.processingTimes.shift();
    }
    
    // 평균 계산
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    this.stats.avgProcessingTime = Math.round(sum / this.processingTimes.length);
  }
  
  // 현재 상태
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      stats: this.stats,
      health: this.getHealth()
    };
  }
  
  // 건강 상태
  getHealth() {
    const queueUsage = (this.queue.length / this.maxQueueSize) * 100;
    const processingUsage = (this.processing.size / this.maxConcurrent) * 100;
    const errorRate = this.stats.totalRequests > 0 
      ? ((this.stats.failedRequests + this.stats.timeoutRequests) / this.stats.totalRequests) * 100
      : 0;
    
    if (queueUsage > 80 || processingUsage > 90 || errorRate > 10) {
      return 'unhealthy';
    } else if (queueUsage > 50 || processingUsage > 70 || errorRate > 5) {
      return 'degraded';
    }
    
    return 'healthy';
  }
  
  // 큐 비우기
  clear() {
    // 모든 대기 요청 거부
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      request.reject(new Error('Queue cleared'));
    }
    
    this.stats.rejectedRequests += this.queue.length;
  }
  
  // 통계 초기화
  resetStats() {
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      rejectedRequests: 0,
      avgProcessingTime: 0
    };
    this.processingTimes = [];
  }
}

// 기본 인스턴스
const defaultQueue = new RequestQueue({
  maxConcurrent: 5,  // AI 처리는 무거우므로 동시 5개로 제한
  maxQueueSize: 50,
  timeout: 10000     // 10초 타임아웃
});

module.exports = { RequestQueue, defaultQueue };