// 성능 최적화 미들웨어
const compression = require('compression');

// 응답 시간 측정 미들웨어
const responseTime = (req, res, next) => {
  const start = process.hrtime.bigint();
  
  // 응답 시간 헤더 먼저 설정
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // 나노초를 밀리초로
    
    // 느린 요청 로깅
    if (duration > 1000) {
      console.warn(`⚠️ 느린 요청: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
    } else if (duration > 100) {
      console.log(`📊 ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
    }
  });
  
  next();
};

// 요청 크기 제한
const requestLimit = (maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    let size = 0;
    
    req.on('data', chunk => {
      size += chunk.length;
      
      if (size > maxSize) {
        res.status(413).json({
          success: false,
          error: `요청 크기 초과: 최대 ${maxSize / 1024 / 1024}MB`
        });
        req.connection.destroy();
      }
    });
    
    next();
  };
};

// 동시 요청 제한 (요청 큐)
class RequestQueue {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.current = 0;
    this.queue = [];
    this.processing = new Map();
  }
  
  async process(req, res, handler) {
    // 동시 요청 수 체크
    if (this.current >= this.maxConcurrent) {
      // 큐에 추가
      await new Promise(resolve => {
        this.queue.push(resolve);
      });
    }
    
    this.current++;
    const id = `${req.method}-${req.url}-${Date.now()}`;
    this.processing.set(id, Date.now());
    
    try {
      // 실제 핸들러 실행
      await handler(req, res);
    } finally {
      this.current--;
      this.processing.delete(id);
      
      // 대기 중인 요청 처리
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }
  
  getStatus() {
    return {
      current: this.current,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      processing: Array.from(this.processing.entries()).map(([id, start]) => ({
        id,
        duration: Date.now() - start
      }))
    };
  }
}

// Rate Limiting (속도 제한)
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1분
    this.maxRequests = options.maxRequests || 100;
    this.clients = new Map();
    
    // 정기 정리
    setInterval(() => this.cleanup(), this.windowMs);
  }
  
  check(clientId) {
    const now = Date.now();
    const client = this.clients.get(clientId) || { requests: [], blocked: false };
    
    // 시간 창 내의 요청만 유지
    client.requests = client.requests.filter(time => now - time < this.windowMs);
    
    // 제한 체크
    if (client.requests.length >= this.maxRequests) {
      client.blocked = true;
      this.clients.set(clientId, client);
      return false;
    }
    
    // 새 요청 추가
    client.requests.push(now);
    client.blocked = false;
    this.clients.set(clientId, client);
    
    return true;
  }
  
  middleware() {
    return (req, res, next) => {
      const clientId = req.ip || req.connection.remoteAddress;
      
      if (!this.check(clientId)) {
        return res.status(429).json({
          success: false,
          error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }
      
      next();
    };
  }
  
  cleanup() {
    const now = Date.now();
    
    for (const [clientId, data] of this.clients.entries()) {
      // 오래된 클라이언트 제거
      if (data.requests.length === 0 || 
          now - data.requests[data.requests.length - 1] > this.windowMs * 2) {
        this.clients.delete(clientId);
      }
    }
  }
  
  getStatus() {
    return {
      clients: this.clients.size,
      blocked: Array.from(this.clients.values()).filter(c => c.blocked).length,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }
}

// ETag 지원 (조건부 요청)
const etag = require('etag');
const conditional = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // ETag 생성
    if (body && !res.get('ETag')) {
      res.set('ETag', etag(body));
    }
    
    // If-None-Match 체크
    if (req.headers['if-none-match'] === res.get('ETag')) {
      return res.status(304).end();
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

// 캐시 제어 헤더
const cacheControl = (options = {}) => {
  return (req, res, next) => {
    const defaults = {
      '/api/analyze': 'no-cache',
      '/api/auth': 'no-store',
      '/static': 'public, max-age=86400', // 1일
      '/api/stats': 'private, max-age=300' // 5분
    };
    
    // URL 패턴에 따른 캐시 설정
    for (const [pattern, value] of Object.entries(defaults)) {
      if (req.url.startsWith(pattern)) {
        res.set('Cache-Control', value);
        break;
      }
    }
    
    next();
  };
};

// 통합 성능 최적화 미들웨어
const optimize = (app, options = {}) => {
  // 압축
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
  
  // 응답 시간 측정
  app.use(responseTime);
  
  // 요청 크기 제한
  app.use(requestLimit(options.maxRequestSize || 10 * 1024 * 1024));
  
  // 조건부 요청
  app.use(conditional);
  
  // 캐시 제어
  app.use(cacheControl(options.cache));
  
  // Rate Limiting
  const rateLimiter = new RateLimiter(options.rateLimit);
  app.use(rateLimiter.middleware());
  
  // 상태 엔드포인트
  app.get('/api/performance', (req, res) => {
    res.json({
      rateLimiter: rateLimiter.getStatus(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  });
  
  return {
    rateLimiter,
    requestQueue: new RequestQueue(options.maxConcurrent || 20)
  };
};

module.exports = {
  responseTime,
  requestLimit,
  RequestQueue,
  RateLimiter,
  conditional,
  cacheControl,
  optimize
};