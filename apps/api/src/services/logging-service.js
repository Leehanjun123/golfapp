// Golf Pro API - Advanced Logging Service

const fs = require('fs').promises;
const path = require('path');

// ===========================================
// 로그 레벨 정의
// ===========================================
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

const LOG_LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN', 
  2: 'INFO',
  3: 'DEBUG',
  4: 'TRACE'
};

// ===========================================
// 고급 로깅 시스템
// ===========================================
class Logger {
  constructor(options = {}) {
    this.level = options.level || LOG_LEVELS.INFO;
    this.logDir = options.logDir || './logs';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.format = options.format || 'json';
    
    // 로그 버퍼 (배치 처리용)
    this.logBuffer = [];
    this.bufferSize = options.bufferSize || 100;
    this.flushInterval = options.flushInterval || 5000; // 5초
    
    // 로그 파일 경로들
    this.logFiles = {
      combined: path.join(this.logDir, 'combined.log'),
      error: path.join(this.logDir, 'error.log'),
      performance: path.join(this.logDir, 'performance.log'),
      security: path.join(this.logDir, 'security.log'),
      api: path.join(this.logDir, 'api.log')
    };

    this.init();
  }

  async init() {
    // 로그 디렉토리 생성
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('로그 디렉토리 생성 실패:', error);
    }

    // 주기적 로그 버퍼 플러시
    if (this.enableFile) {
      setInterval(() => this.flushBuffer(), this.flushInterval);
    }

    // 일일 로그 로테이션
    this.scheduleLogRotation();
  }

  // 메인 로깅 메서드
  log(level, message, meta = {}, category = 'combined') {
    if (level > this.level) return;

    const logEntry = this.formatLogEntry(level, message, meta);
    
    // 콘솔 출력
    if (this.enableConsole) {
      this.logToConsole(level, logEntry);
    }

    // 파일 출력 (버퍼링)
    if (this.enableFile) {
      this.addToBuffer(logEntry, category);
    }
  }

  // 로그 엔트리 포맷팅
  formatLogEntry(level, message, meta) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    
    const baseEntry = {
      timestamp,
      level: levelName,
      message,
      pid: process.pid,
      ...meta
    };

    // 스택 트레이스 추가 (ERROR 레벨)
    if (level === LOG_LEVELS.ERROR && meta.error) {
      baseEntry.stack = meta.error.stack;
    }

    // 요청 정보 추가
    if (meta.req) {
      baseEntry.request = {
        method: meta.req.method,
        url: meta.req.originalUrl || meta.req.url,
        ip: meta.req.ip,
        userAgent: meta.req.get('User-Agent'),
        user: meta.req.user?.id || 'anonymous'
      };
      delete meta.req; // 중복 제거
    }

    return baseEntry;
  }

  // 콘솔 출력
  logToConsole(level, logEntry) {
    const colorCodes = {
      [LOG_LEVELS.ERROR]: '\x1b[31m', // 빨강
      [LOG_LEVELS.WARN]: '\x1b[33m',  // 노랑
      [LOG_LEVELS.INFO]: '\x1b[36m',  // 청록
      [LOG_LEVELS.DEBUG]: '\x1b[35m', // 자주
      [LOG_LEVELS.TRACE]: '\x1b[37m'  // 회색
    };
    
    const resetCode = '\x1b[0m';
    const colorCode = colorCodes[level] || '';
    
    if (this.format === 'json') {
      console.log(`${colorCode}${JSON.stringify(logEntry)}${resetCode}`);
    } else {
      const { timestamp, level: levelName, message, request } = logEntry;
      const requestInfo = request ? ` [${request.method} ${request.url}]` : '';
      console.log(`${colorCode}${timestamp} [${levelName}]${requestInfo}: ${message}${resetCode}`);
    }
  }

  // 로그 버퍼에 추가
  addToBuffer(logEntry, category) {
    this.logBuffer.push({
      entry: logEntry,
      category,
      timestamp: Date.now()
    });

    // 버퍼 크기 초과 시 즉시 플러시
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  // 로그 버퍼 플러시
  async flushBuffer() {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // 카테고리별로 그룹화
    const logsByCategory = {};
    for (const { entry, category } of logsToFlush) {
      if (!logsByCategory[category]) {
        logsByCategory[category] = [];
      }
      logsByCategory[category].push(entry);
    }

    // 각 카테고리별로 파일에 기록
    for (const [category, logs] of Object.entries(logsByCategory)) {
      try {
        await this.writeLogsToFile(category, logs);
      } catch (error) {
        console.error(`로그 파일 쓰기 실패 [${category}]:`, error);
      }
    }
  }

  // 파일에 로그 기록
  async writeLogsToFile(category, logs) {
    const filePath = this.logFiles[category] || this.logFiles.combined;
    
    try {
      // 파일 크기 확인 및 로테이션
      await this.checkAndRotateFile(filePath);
      
      // 로그 데이터 준비
      const logLines = logs.map(log => JSON.stringify(log) + '\n').join('');
      
      // 파일에 추가
      await fs.appendFile(filePath, logLines);
      
    } catch (error) {
      console.error(`파일 쓰기 오류 [${filePath}]:`, error);
    }
  }

  // 파일 로테이션
  async checkAndRotateFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > this.maxFileSize) {
        await this.rotateFile(filePath);
      }
    } catch (error) {
      // 파일이 존재하지 않으면 무시
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  // 파일 로테이션 실행
  async rotateFile(filePath) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    
    // 기존 백업 파일들 이름 변경
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldFile = path.join(dir, `${name}.${i}${ext}`);
      const newFile = path.join(dir, `${name}.${i + 1}${ext}`);
      
      try {
        await fs.access(oldFile);
        if (i === this.maxFiles - 1) {
          await fs.unlink(oldFile); // 가장 오래된 파일 삭제
        } else {
          await fs.rename(oldFile, newFile);
        }
      } catch (error) {
        // 파일이 없으면 무시
      }
    }
    
    // 현재 파일을 .1로 이름 변경
    const backupFile = path.join(dir, `${name}.1${ext}`);
    try {
      await fs.rename(filePath, backupFile);
    } catch (error) {
      console.error('파일 로테이션 실패:', error);
    }
  }

  // 일일 로그 로테이션 스케줄링
  scheduleLogRotation() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.rotateDailyLogs();
      // 24시간마다 반복
      setInterval(() => this.rotateDailyLogs(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  // 일일 로그 로테이션
  async rotateDailyLogs() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    for (const [category, filePath] of Object.entries(this.logFiles)) {
      try {
        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);
        const name = path.basename(filePath, ext);
        const archivedFile = path.join(dir, `${name}-${dateStr}${ext}`);
        
        // 파일이 존재하면 아카이브
        await fs.access(filePath);
        await fs.rename(filePath, archivedFile);
        
        console.log(`로그 파일 아카이브 완료: ${archivedFile}`);
      } catch (error) {
        // 파일이 없으면 무시
      }
    }
  }

  // 편의 메서드들
  error(message, meta = {}) {
    this.log(LOG_LEVELS.ERROR, message, meta, 'error');
  }

  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message, meta = {}) {
    this.log(LOG_LEVELS.DEBUG, message, meta);
  }

  trace(message, meta = {}) {
    this.log(LOG_LEVELS.TRACE, message, meta);
  }

  // 특별한 카테고리 로깅
  performance(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta, 'performance');
  }

  security(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta, 'security');
  }

  api(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta, 'api');
  }

  // 로그 검색
  async searchLogs(options = {}) {
    const {
      category = 'combined',
      level = null,
      startDate = null,
      endDate = null,
      limit = 100,
      keyword = null
    } = options;

    const filePath = this.logFiles[category];
    if (!filePath) {
      throw new Error(`Unknown log category: ${category}`);
    }

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line);
      
      let logs = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);

      // 필터링
      if (level) {
        logs = logs.filter(log => log.level === level);
      }

      if (startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
      }

      if (endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
      }

      if (keyword) {
        logs = logs.filter(log => 
          log.message.toLowerCase().includes(keyword.toLowerCase())
        );
      }

      // 최신 순으로 정렬하고 제한
      logs = logs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return logs;
    } catch (error) {
      throw new Error(`로그 검색 실패: ${error.message}`);
    }
  }

  // 로그 통계
  async getLogStats(category = 'combined', hours = 24) {
    const filePath = this.logFiles[category];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line);
      
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const stats = {
        total: 0,
        levels: {},
        hourly: {},
        errors: []
      };

      for (const line of lines) {
        try {
          const log = JSON.parse(line);
          const logTime = new Date(log.timestamp);
          
          if (logTime >= cutoffTime) {
            stats.total++;
            
            // 레벨별 통계
            stats.levels[log.level] = (stats.levels[log.level] || 0) + 1;
            
            // 시간별 통계
            const hour = logTime.getHours();
            stats.hourly[hour] = (stats.hourly[hour] || 0) + 1;
            
            // 에러 로그 수집
            if (log.level === 'ERROR') {
              stats.errors.push({
                timestamp: log.timestamp,
                message: log.message,
                stack: log.stack
              });
            }
          }
        } catch {
          // 파싱 실패 무시
        }
      }

      return stats;
    } catch (error) {
      throw new Error(`로그 통계 생성 실패: ${error.message}`);
    }
  }

  // 리소스 정리
  async cleanup() {
    await this.flushBuffer();
    console.log('로깅 시스템 정리 완료');
  }
}

// ===========================================
// 요청 로깅 미들웨어
// ===========================================
const requestLoggingMiddleware = (logger) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // 요청 시작 로그
    logger.api('Request started', {
      req,
      startTime
    });

    // 응답 완료 시 로깅
    const originalSend = res.send;
    res.send = function(data) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
      const message = `Request completed - ${res.statusCode} ${duration}ms`;
      
      logger[logLevel](message, {
        req,
        statusCode: res.statusCode,
        duration,
        responseSize: data ? Buffer.byteLength(data) : 0
      });

      return originalSend.call(this, data);
    };

    next();
  };
};

// ===========================================
// 에러 로깅 미들웨어
// ===========================================
const errorLoggingMiddleware = (logger) => {
  return (error, req, res, next) => {
    logger.error('Request error', {
      req,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      statusCode: error.statusCode || 500
    });

    next(error);
  };
};

// ===========================================
// 글로벌 로거 인스턴스
// ===========================================
const logger = new Logger({
  level: process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] : LOG_LEVELS.INFO,
  logDir: process.env.LOG_DIR || './logs',
  enableConsole: process.env.NODE_ENV !== 'production',
  enableFile: true,
  format: 'json'
});

// 프로세스 종료 시 정리
process.on('SIGTERM', async () => {
  await logger.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await logger.cleanup();
  process.exit(0);
});

// ===========================================
// Export
// ===========================================
module.exports = {
  Logger,
  logger,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  LOG_LEVELS
};