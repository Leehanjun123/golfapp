import { InteractionManager } from 'react-native';

class PerformanceMonitor {
  private renderTimes: Map<string, number> = new Map();
  private apiCallTimes: Map<string, number> = new Map();

  // 컴포넌트 렌더링 시간 측정
  startComponentRender(componentName: string) {
    this.renderTimes.set(componentName, Date.now());
  }

  endComponentRender(componentName: string) {
    const startTime = this.renderTimes.get(componentName);
    if (startTime) {
      const duration = Date.now() - startTime;
      if (duration > 16) { // 60fps = 16ms per frame
        console.warn(`Slow render detected in ${componentName}: ${duration}ms`);
      }
      this.renderTimes.delete(componentName);
    }
  }

  // API 호출 성능 측정
  startAPICall(endpoint: string) {
    this.apiCallTimes.set(endpoint, Date.now());
  }

  endAPICall(endpoint: string) {
    const startTime = this.apiCallTimes.get(endpoint);
    if (startTime) {
      const duration = Date.now() - startTime;
      if (duration > 3000) {
        console.warn(`Slow API call to ${endpoint}: ${duration}ms`);
      }
      this.apiCallTimes.delete(endpoint);
    }
  }

  // 무거운 작업을 인터랙션 후로 지연
  runAfterInteractions(callback: () => void) {
    InteractionManager.runAfterInteractions(callback);
  }

  // 메모리 사용량 체크 (개발 모드에서만)
  checkMemoryUsage() {
    if (__DEV__) {
      const usage = (performance as any).memory;
      if (usage) {
        const usedMB = Math.round(usage.usedJSHeapSize / 1048576);
        const totalMB = Math.round(usage.totalJSHeapSize / 1048576);
        if (usedMB / totalMB > 0.9) {
          console.warn(`High memory usage: ${usedMB}MB / ${totalMB}MB`);
        }
      }
    }
  }

  // 성능 개선 제안
  getSuggestions(): string[] {
    const suggestions: string[] = [];
    
    // 느린 렌더링 컴포넌트 체크
    this.renderTimes.forEach((time, component) => {
      if (Date.now() - time > 1000) {
        suggestions.push(`Component ${component} may be stuck in render`);
      }
    });

    // 느린 API 호출 체크
    this.apiCallTimes.forEach((time, endpoint) => {
      if (Date.now() - time > 5000) {
        suggestions.push(`API call to ${endpoint} is taking too long`);
      }
    });

    return suggestions;
  }
}

export default new PerformanceMonitor();