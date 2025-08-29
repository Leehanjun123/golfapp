// 메모리 모니터링 및 관리
const v8 = require('v8');

class MemoryMonitor {
  constructor(options = {}) {
    this.options = {
      warningThreshold: options.warningThreshold || 0.8,  // 80% 경고
      criticalThreshold: options.criticalThreshold || 0.9, // 90% 위험
      checkInterval: options.checkInterval || 30000,       // 30초마다 체크
      autoGC: options.autoGC !== false,                    // 자동 GC 활성화
      ...options
    };
    
    this.history = [];
    this.maxHistory = 100;
    this.alerts = [];
    
    // 모니터링 시작
    if (this.options.checkInterval > 0) {
      this.startMonitoring();
    }
  }

  // 현재 메모리 상태 가져오기
  getMemoryStatus() {
    const usage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    const status = {
      timestamp: Date.now(),
      rss: usage.rss,                          // Resident Set Size
      heapTotal: usage.heapTotal,              // V8 힙 전체
      heapUsed: usage.heapUsed,                // V8 힙 사용량
      external: usage.external,                // C++ 객체 메모리
      arrayBuffers: usage.arrayBuffers || 0,   // ArrayBuffer 메모리
      
      // 힙 통계
      heapSizeLimit: heapStats.heap_size_limit,
      totalHeapSize: heapStats.total_heap_size,
      usedHeapSize: heapStats.used_heap_size,
      
      // 계산된 메트릭
      heapUsagePercent: (usage.heapUsed / usage.heapTotal),
      systemUsagePercent: (usage.rss / heapStats.heap_size_limit),
      
      // 사람이 읽기 쉬운 형식
      formatted: {
        rss: this.formatBytes(usage.rss),
        heapTotal: this.formatBytes(usage.heapTotal),
        heapUsed: this.formatBytes(usage.heapUsed),
        external: this.formatBytes(usage.external),
        heapUsagePercent: `${(usage.heapUsed / usage.heapTotal * 100).toFixed(1)}%`,
        systemUsagePercent: `${(usage.rss / heapStats.heap_size_limit * 100).toFixed(1)}%`
      }
    };
    
    // 상태 레벨 결정
    if (status.heapUsagePercent >= this.options.criticalThreshold) {
      status.level = 'critical';
    } else if (status.heapUsagePercent >= this.options.warningThreshold) {
      status.level = 'warning';
    } else {
      status.level = 'normal';
    }
    
    return status;
  }

  // 메모리 체크 및 액션
  checkMemory() {
    const status = this.getMemoryStatus();
    
    // 히스토리에 추가
    this.history.push(status);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    // 경고 처리
    if (status.level === 'critical') {
      this.handleCritical(status);
    } else if (status.level === 'warning') {
      this.handleWarning(status);
    }
    
    return status;
  }

  // 경고 상황 처리
  handleWarning(status) {
    const alert = {
      level: 'warning',
      message: `메모리 사용량 경고: ${status.formatted.heapUsagePercent}`,
      timestamp: Date.now(),
      status
    };
    
    this.alerts.push(alert);
    console.warn(`⚠️ ${alert.message}`);
    
    // 자동 GC 시도
    if (this.options.autoGC && global.gc) {
      this.forceGC();
    }
  }

  // 위험 상황 처리
  handleCritical(status) {
    const alert = {
      level: 'critical',
      message: `메모리 사용량 위험: ${status.formatted.heapUsagePercent}`,
      timestamp: Date.now(),
      status
    };
    
    this.alerts.push(alert);
    console.error(`🚨 ${alert.message}`);
    
    // 적극적인 메모리 정리
    this.emergencyCleanup();
  }

  // 강제 가비지 컬렉션
  forceGC() {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;
      
      if (freed > 0) {
        console.log(`♻️ GC 실행: ${this.formatBytes(freed)} 해제`);
      }
      
      return freed;
    }
    return 0;
  }

  // 긴급 메모리 정리
  emergencyCleanup() {
    console.log('🚨 긴급 메모리 정리 시작...');
    
    // 1. 강제 GC
    this.forceGC();
    
    // 2. 글로벌 캐시 정리 (있다면)
    if (global.cacheManager) {
      global.cacheManager.clear();
    }
    
    // 3. 버퍼 정리
    if (global.bufferPool) {
      global.bufferPool = [];
    }
    
    // 4. 추가 GC
    setTimeout(() => this.forceGC(), 1000);
    
    console.log('✅ 긴급 메모리 정리 완료');
  }

  // 모니터링 시작
  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, this.options.checkInterval);
    
    console.log('📊 메모리 모니터링 시작');
  }

  // 모니터링 중지
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      console.log('📊 메모리 모니터링 중지');
    }
  }

  // 메모리 사용 추세 분석
  getMemoryTrend() {
    if (this.history.length < 2) {
      return { trend: 'unknown', change: 0 };
    }
    
    const recent = this.history.slice(-10);
    const older = this.history.slice(-20, -10);
    
    if (older.length === 0) {
      return { trend: 'insufficient_data', change: 0 };
    }
    
    const recentAvg = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.heapUsed, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg * 100);
    
    let trend;
    if (change > 10) trend = 'increasing';
    else if (change < -10) trend = 'decreasing';
    else trend = 'stable';
    
    return { trend, change: change.toFixed(1) };
  }

  // 메모리 리포트 생성
  generateReport() {
    const current = this.getMemoryStatus();
    const trend = this.getMemoryTrend();
    
    return {
      current,
      trend,
      history: {
        count: this.history.length,
        first: this.history[0]?.timestamp,
        last: this.history[this.history.length - 1]?.timestamp
      },
      alerts: {
        total: this.alerts.length,
        warnings: this.alerts.filter(a => a.level === 'warning').length,
        critical: this.alerts.filter(a => a.level === 'critical').length,
        recent: this.alerts.slice(-5)
      },
      recommendations: this.getRecommendations(current, trend)
    };
  }

  // 개선 권장사항
  getRecommendations(status, trend) {
    const recommendations = [];
    
    if (status.heapUsagePercent > 0.7) {
      recommendations.push('메모리 사용량이 높습니다. 캐시 크기를 줄이거나 이미지 최적화를 강화하세요.');
    }
    
    if (trend.trend === 'increasing' && parseFloat(trend.change) > 20) {
      recommendations.push('메모리 누수 가능성이 있습니다. 이벤트 리스너와 타이머를 확인하세요.');
    }
    
    if (status.external > 100 * 1024 * 1024) { // 100MB
      recommendations.push('외부 메모리 사용량이 높습니다. 대용량 버퍼나 이미지 처리를 확인하세요.');
    }
    
    return recommendations;
  }

  // 바이트를 읽기 쉬운 형식으로 변환
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 디버그 출력
  debug() {
    const report = this.generateReport();
    
    console.log('\n=== 메모리 상태 ===');
    console.table([report.current.formatted]);
    
    console.log('\n=== 메모리 추세 ===');
    console.log(`추세: ${report.trend.trend} (${report.trend.change}%)`);
    
    if (report.alerts.recent.length > 0) {
      console.log('\n=== 최근 알림 ===');
      report.alerts.recent.forEach(alert => {
        console.log(`[${alert.level}] ${alert.message}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n=== 권장사항 ===');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
  }
}

// 싱글톤 인스턴스 (성능 최적화)
const memoryMonitor = new MemoryMonitor({
  warningThreshold: 0.80,  // 경고 임계값 상향
  criticalThreshold: 0.90, // 위험 임계값 상향
  checkInterval: 300000,   // 5분마다 체크로 변경
  autoGC: false            // 자동 GC 비활성화
});

// 프로세스 종료 시 정리
process.on('exit', () => {
  memoryMonitor.stopMonitoring();
});

module.exports = {
  MemoryMonitor,
  memoryMonitor
};