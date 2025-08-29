// Golf Pro API - Performance Monitoring Middleware

const os = require('os');
const { performance } = require('perf_hooks');

// ===========================================
// 성능 메트릭 수집
// ===========================================
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        routes: new Map()
      },
      response: {
        times: [],
        slowQueries: [],
        currentConnections: 0
      },
      system: {
        memory: [],
        cpu: [],
        uptime: process.uptime()
      },
      errors: []
    };
    
    // 시스템 메트릭 수집 시작
    this.startSystemMetrics();
  }

  // 요청 메트릭 기록
  recordRequest(req, res, responseTime) {
    this.metrics.requests.total++;
    
    // 응답 상태에 따른 분류
    if (res.statusCode >= 200 && res.statusCode < 300) {
      this.metrics.requests.success++;
    } else if (res.statusCode >= 400) {
      this.metrics.requests.errors++;
    }

    // 라우트별 통계
    const route = req.route?.path || req.path;
    if (!this.metrics.requests.routes.has(route)) {
      this.metrics.requests.routes.set(route, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity,
        errors: 0
      });
    }

    const routeStats = this.metrics.requests.routes.get(route);
    routeStats.count++;
    routeStats.totalTime += responseTime;
    routeStats.avgTime = routeStats.totalTime / routeStats.count;
    routeStats.maxTime = Math.max(routeStats.maxTime, responseTime);
    routeStats.minTime = Math.min(routeStats.minTime, responseTime);
    
    if (res.statusCode >= 400) {
      routeStats.errors++;
    }

    // 응답 시간 기록 (최근 1000개)
    this.metrics.response.times.push({
      time: responseTime,
      timestamp: Date.now(),
      route,
      status: res.statusCode
    });
    
    if (this.metrics.response.times.length > 1000) {
      this.metrics.response.times.shift();
    }

    // 느린 쿼리 감지 (2초 이상)
    if (responseTime > 2000) {
      this.metrics.response.slowQueries.push({
        route,
        responseTime,
        timestamp: Date.now(),
        method: req.method,
        query: req.query,
        user: req.user?.id || 'anonymous'
      });
      
      // 최근 100개만 유지
      if (this.metrics.response.slowQueries.length > 100) {
        this.metrics.response.slowQueries.shift();
      }
    }
  }

  // 에러 기록
  recordError(error, req = null) {
    this.metrics.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      route: req?.route?.path || req?.path || 'unknown',
      method: req?.method || 'unknown',
      user: req?.user?.id || 'anonymous'
    });

    // 최근 500개만 유지
    if (this.metrics.errors.length > 500) {
      this.metrics.errors.shift();
    }
  }

  // 시스템 메트릭 수집
  startSystemMetrics() {
    setInterval(() => {
      // 메모리 사용량
      const memUsage = process.memoryUsage();
      const systemMem = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        freeSystem: os.freemem(),
        totalSystem: os.totalmem(),
        timestamp: Date.now()
      };
      
      this.metrics.system.memory.push(systemMem);
      if (this.metrics.system.memory.length > 60) { // 5분간 데이터
        this.metrics.system.memory.shift();
      }

      // CPU 사용률 (근사치)
      const cpuUsage = process.cpuUsage();
      this.metrics.system.cpu.push({
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: os.loadavg(),
        timestamp: Date.now()
      });
      
      if (this.metrics.system.cpu.length > 60) {
        this.metrics.system.cpu.shift();
      }

      // 업타임 업데이트
      this.metrics.system.uptime = process.uptime();
      
    }, 5000); // 5초마다
  }

  // 현재 메트릭 반환
  getMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;

    // 최근 응답시간 통계
    const recentResponses = this.metrics.response.times.filter(
      t => t.timestamp > oneMinuteAgo
    );

    const avgResponseTime = recentResponses.length > 0 
      ? recentResponses.reduce((sum, t) => sum + t.time, 0) / recentResponses.length
      : 0;

    // 최근 에러율
    const recentErrors = this.metrics.errors.filter(
      e => e.timestamp > fiveMinutesAgo
    );

    const errorRate = this.metrics.requests.total > 0 
      ? (this.metrics.requests.errors / this.metrics.requests.total) * 100
      : 0;

    // Top 라우트 (요청 수 기준)
    const topRoutes = Array.from(this.metrics.requests.routes.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([route, stats]) => ({ route, ...stats }));

    return {
      summary: {
        totalRequests: this.metrics.requests.total,
        successRequests: this.metrics.requests.success,
        errorRequests: this.metrics.requests.errors,
        errorRate: errorRate.toFixed(2),
        avgResponseTime: Math.round(avgResponseTime),
        uptime: this.metrics.system.uptime,
        currentConnections: this.metrics.response.currentConnections
      },
      routes: topRoutes,
      slowQueries: this.metrics.response.slowQueries.slice(-10),
      recentErrors: recentErrors.slice(-10),
      system: {
        memory: this.metrics.system.memory.slice(-12), // 최근 1분
        cpu: this.metrics.system.cpu.slice(-12),
        loadAverage: os.loadavg()
      },
      performance: {
        responseTimePercentiles: this.calculatePercentiles(recentResponses),
        requestsPerMinute: recentResponses.length,
        peakMemory: Math.max(...this.metrics.system.memory.map(m => m.heapUsed))
      }
    };
  }

  // 퍼센타일 계산
  calculatePercentiles(responses) {
    if (responses.length === 0) return {};

    const times = responses.map(r => r.time).sort((a, b) => a - b);
    const len = times.length;

    return {
      p50: times[Math.floor(len * 0.5)] || 0,
      p90: times[Math.floor(len * 0.9)] || 0,
      p95: times[Math.floor(len * 0.95)] || 0,
      p99: times[Math.floor(len * 0.99)] || 0
    };
  }

  // 메트릭 리셋
  reset() {
    this.metrics.requests = {
      total: 0,
      success: 0,
      errors: 0,
      routes: new Map()
    };
    this.metrics.response.times = [];
    this.metrics.response.slowQueries = [];
    this.metrics.errors = [];
  }
}

// 글로벌 메트릭 인스턴스
const metrics = new PerformanceMetrics();

// ===========================================
// 성능 모니터링 미들웨어
// ===========================================
const performanceMiddleware = (options = {}) => {
  const { 
    trackMemory = true, 
    trackResponseTime = true,
    logSlowQueries = true,
    slowThreshold = 2000 
  } = options;

  return (req, res, next) => {
    const startTime = performance.now();
    
    // 현재 연결 수 증가
    metrics.metrics.response.currentConnections++;

    // 응답 완료 시 메트릭 기록
    const originalSend = res.send;
    res.send = function(data) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // 메트릭 기록
      if (trackResponseTime) {
        metrics.recordRequest(req, res, responseTime);
      }

      // 느린 쿼리 로깅
      if (logSlowQueries && responseTime > slowThreshold) {
        console.warn(`🐌 Slow Query Detected:`, {
          route: req.route?.path || req.path,
          method: req.method,
          responseTime: Math.round(responseTime),
          status: res.statusCode,
          user: req.user?.id || 'anonymous'
        });
      }

      // 연결 수 감소
      metrics.metrics.response.currentConnections--;
      
      // 성능 헤더 추가
      res.set({
        'X-Response-Time': `${Math.round(responseTime)}ms`,
        'X-Process-Memory': `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      });

      return originalSend.call(this, data);
    };

    // 에러 처리
    const originalNext = next;
    next = (error) => {
      if (error) {
        metrics.recordError(error, req);
      }
      return originalNext(error);
    };

    next();
  };
};

// ===========================================
// 실시간 모니터링 대시보드용 데이터
// ===========================================
const getRealtimeMetrics = () => {
  return {
    timestamp: Date.now(),
    ...metrics.getMetrics()
  };
};

// ===========================================
// 헬스체크 엔드포인트
// ===========================================
const healthCheck = () => {
  const memUsage = process.memoryUsage();
  const systemHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    },
    system: {
      loadAverage: os.loadavg(),
      freeMemory: Math.round(os.freemem() / 1024 / 1024),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024)
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  // 헬스 상태 결정
  const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  const systemMemoryUsagePercent = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
  
  if (memoryUsagePercent > 90 || systemMemoryUsagePercent > 95) {
    systemHealth.status = 'warning';
  }
  
  if (memoryUsagePercent > 95 || systemMemoryUsagePercent > 98) {
    systemHealth.status = 'critical';
  }

  return systemHealth;
};

// ===========================================
// 성능 알림
// ===========================================
class PerformanceAlerts {
  constructor() {
    this.alerts = [];
    this.thresholds = {
      responseTime: 5000, // 5초
      errorRate: 10, // 10%
      memoryUsage: 90, // 90%
      cpuUsage: 90 // 90%
    };
    
    // 주기적 알림 체크
    setInterval(() => this.checkAlerts(), 30000); // 30초마다
  }

  checkAlerts() {
    const currentMetrics = metrics.getMetrics();
    
    // 응답시간 알림
    if (currentMetrics.summary.avgResponseTime > this.thresholds.responseTime) {
      this.createAlert('HIGH_RESPONSE_TIME', {
        current: currentMetrics.summary.avgResponseTime,
        threshold: this.thresholds.responseTime
      });
    }

    // 에러율 알림
    const errorRate = parseFloat(currentMetrics.summary.errorRate);
    if (errorRate > this.thresholds.errorRate) {
      this.createAlert('HIGH_ERROR_RATE', {
        current: errorRate,
        threshold: this.thresholds.errorRate
      });
    }

    // 메모리 사용률 알림
    const memUsage = process.memoryUsage();
    const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (memoryPercent > this.thresholds.memoryUsage) {
      this.createAlert('HIGH_MEMORY_USAGE', {
        current: memoryPercent,
        threshold: this.thresholds.memoryUsage
      });
    }
  }

  createAlert(type, data) {
    const alert = {
      id: Date.now().toString(),
      type,
      data,
      timestamp: Date.now(),
      acknowledged: false
    };

    // 중복 알림 방지 (최근 5분 내 동일 타입)
    const recentAlerts = this.alerts.filter(
      a => a.type === type && Date.now() - a.timestamp < 300000
    );

    if (recentAlerts.length === 0) {
      this.alerts.push(alert);
      console.warn(`🚨 Performance Alert [${type}]:`, data);
      
      // 최근 100개만 유지
      if (this.alerts.length > 100) {
        this.alerts.shift();
      }
    }
  }

  getAlerts() {
    return this.alerts.filter(a => !a.acknowledged);
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }
}

const performanceAlerts = new PerformanceAlerts();

// ===========================================
// Export
// ===========================================
module.exports = {
  performanceMiddleware,
  getRealtimeMetrics,
  healthCheck,
  performanceAlerts,
  metrics
};