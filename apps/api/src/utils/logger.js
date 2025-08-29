// 구조화된 로깅 시스템
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
    
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = process.env.LOG_LEVEL === 'production' ? this.levels.INFO : this.levels.DEBUG;
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      meta,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development'
    };

    // 에러 객체 직렬화
    if (meta.error instanceof Error) {
      logEntry.meta.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack?.split('\n').slice(0, 5).join('\n') // 스택 트레이스 제한
      };
    }

    return JSON.stringify(logEntry);
  }

  writeToFile(level, logEntry) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${level.toLowerCase()}-${today}.log`;
    const filepath = path.join(this.logDir, filename);
    
    fs.appendFileSync(filepath, logEntry + '\n');
  }

  log(level, message, meta = {}) {
    if (this.levels[level] > this.currentLevel) return;

    const logEntry = this.formatLog(level, message, meta);
    
    // 콘솔 출력 (개발 환경)
    if (process.env.NODE_ENV !== 'production') {
      const colorMap = {
        ERROR: '\x1b[31m', // 빨강
        WARN: '\x1b[33m',  // 노랑
        INFO: '\x1b[36m',  // 시안
        DEBUG: '\x1b[37m'  // 흰색
      };
      console.log(`${colorMap[level]}[${level}]\x1b[0m ${message}`, meta.error ? meta.error : '');
    }

    // 파일 출력 (모든 환경)
    this.writeToFile(level, logEntry);

    // 에러는 별도 파일에도 저장
    if (level === 'ERROR') {
      this.writeToFile('ALL_ERRORS', logEntry);
    }
  }

  // 편의 메서드
  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // HTTP 요청 로깅
  httpRequest(req, res, duration) {
    const requestLog = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      status: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    };

    if (res.statusCode >= 400) {
      this.warn(`HTTP ${res.statusCode} ${req.method} ${req.url}`, requestLog);
    } else {
      this.info(`HTTP ${res.statusCode} ${req.method} ${req.url}`, requestLog);
    }
  }

  // 골프 분석 전용 로깅
  golfAnalysis(action, data) {
    const analysisLog = {
      action,
      success: data.success,
      score: data.score || 0,
      processingTime: data.processingTime || 0,
      cacheUsed: data.cacheUsed || false,
      imageSize: data.imageSize || 0,
      errorType: data.errorType || null
    };

    if (data.success) {
      this.info(`골프 분석 ${action} 성공`, analysisLog);
    } else {
      this.warn(`골프 분석 ${action} 실패`, analysisLog);
    }
  }

  // 성능 메트릭 로깅
  performance(metric, value, unit = 'ms') {
    this.info(`성능 메트릭: ${metric}`, {
      metric,
      value,
      unit,
      timestamp: Date.now()
    });
  }

  // 로그 파일 정리 (7일 이상 된 로그 삭제)
  cleanup() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      const files = fs.readdirSync(this.logDir);
      files.forEach(file => {
        const filepath = path.join(this.logDir, file);
        const stat = fs.statSync(filepath);
        if (stat.mtime < sevenDaysAgo) {
          fs.unlinkSync(filepath);
          this.info(`오래된 로그 파일 삭제: ${file}`);
        }
      });
    } catch (error) {
      this.error('로그 파일 정리 실패', { error });
    }
  }
}

// 싱글톤 인스턴스
const logger = new Logger();

// 매일 자정에 로그 정리
setInterval(() => {
  logger.cleanup();
}, 24 * 60 * 60 * 1000); // 24시간

module.exports = logger;