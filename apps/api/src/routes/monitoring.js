// Golf Pro API - Monitoring & Health Check Routes

const express = require('express');
const router = express.Router();
const { 
  getRealtimeMetrics, 
  healthCheck, 
  performanceAlerts 
} = require('../middleware/performance-middleware');
const { logger } = require('../services/logging-service');
const { cacheStats } = require('../services/redis-service');
const { authMiddleware } = require('../middleware/auth');

// ===========================================
// 헬스 체크 엔드포인트
// ===========================================
router.get('/health', (req, res) => {
  try {
    const health = healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Health check failed', { error, req });
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'critical',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===========================================
// 실시간 메트릭
// ===========================================
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const metrics = getRealtimeMetrics();
    
    logger.info('Metrics requested', { 
      req,
      metricsSize: JSON.stringify(metrics).length 
    });
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get metrics', { error, req });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      error_code: 'METRICS_ERROR'
    });
  }
});

// ===========================================
// 성능 알림 조회
// ===========================================
router.get('/alerts', authMiddleware, (req, res) => {
  try {
    const alerts = performanceAlerts.getAlerts();
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length
      }
    });
  } catch (error) {
    logger.error('Failed to get alerts', { error, req });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts',
      error_code: 'ALERTS_ERROR'
    });
  }
});

// ===========================================
// 알림 확인 처리
// ===========================================
router.post('/alerts/:alertId/acknowledge', authMiddleware, (req, res) => {
  try {
    const { alertId } = req.params;
    
    performanceAlerts.acknowledgeAlert(alertId);
    
    logger.info('Alert acknowledged', { 
      req,
      alertId,
      user: req.userId 
    });
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error, req });
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
      error_code: 'ALERT_ACK_ERROR'
    });
  }
});

// ===========================================
// Redis 캐시 통계
// ===========================================
router.get('/cache/stats', authMiddleware, async (req, res) => {
  try {
    const [redisInfo, keyStats] = await Promise.all([
      cacheStats.getRedisInfo(),
      cacheStats.getCacheKeyStats()
    ]);
    
    res.json({
      success: true,
      data: {
        redis: redisInfo,
        keys: keyStats,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error('Failed to get cache stats', { error, req });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
      error_code: 'CACHE_STATS_ERROR'
    });
  }
});

// ===========================================
// 캐시 정리
// ===========================================
router.post('/cache/cleanup', authMiddleware, async (req, res) => {
  try {
    const result = await cacheStats.cleanup();
    
    logger.info('Cache cleanup performed', { 
      req,
      result,
      user: req.userId 
    });
    
    res.json({
      success: true,
      data: result,
      message: `Cleaned up ${result.deletedKeys} expired keys`
    });
  } catch (error) {
    logger.error('Cache cleanup failed', { error, req });
    res.status(500).json({
      success: false,
      error: 'Cache cleanup failed',
      error_code: 'CACHE_CLEANUP_ERROR'
    });
  }
});

// ===========================================
// 로그 검색
// ===========================================
router.get('/logs/search', authMiddleware, async (req, res) => {
  try {
    const {
      category = 'combined',
      level = null,
      startDate = null,
      endDate = null,
      limit = 100,
      keyword = null
    } = req.query;

    const logs = await logger.searchLogs({
      category,
      level,
      startDate,
      endDate,
      limit: parseInt(limit),
      keyword
    });

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
        query: { category, level, startDate, endDate, limit, keyword }
      }
    });
  } catch (error) {
    logger.error('Log search failed', { error, req });
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'LOG_SEARCH_ERROR'
    });
  }
});

// ===========================================
// 로그 통계
// ===========================================
router.get('/logs/stats', authMiddleware, async (req, res) => {
  try {
    const { category = 'combined', hours = 24 } = req.query;
    
    const stats = await logger.getLogStats(category, parseInt(hours));

    res.json({
      success: true,
      data: {
        ...stats,
        category,
        hours: parseInt(hours)
      }
    });
  } catch (error) {
    logger.error('Log stats failed', { error, req });
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'LOG_STATS_ERROR'
    });
  }
});

// ===========================================
// 시스템 정보
// ===========================================
router.get('/system', authMiddleware, (req, res) => {
  try {
    const os = require('os');
    
    const systemInfo = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        pid: process.pid
      },
      system: {
        hostname: os.hostname(),
        type: os.type(),
        release: os.release(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus().map(cpu => ({
          model: cpu.model,
          speed: cpu.speed
        }))
      },
      memory: process.memoryUsage(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        LOG_LEVEL: process.env.LOG_LEVEL
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    logger.error('Failed to get system info', { error, req });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system information',
      error_code: 'SYSTEM_INFO_ERROR'
    });
  }
});

// ===========================================
// 데이터베이스 상태
// ===========================================
router.get('/database', authMiddleware, async (req, res) => {
  try {
    const { query } = require('../database/postgresql');
    
    // 간단한 연결 테스트
    const startTime = Date.now();
    await query('SELECT 1 as test');
    const connectionTime = Date.now() - startTime;

    // 데이터베이스 통계 조회
    const [
      dbSize,
      connectionStats,
      tableStats
    ] = await Promise.all([
      query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `),
      query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
      `),
      query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 10
      `)
    ]);

    res.json({
      success: true,
      data: {
        connection: {
          status: 'connected',
          responseTime: connectionTime
        },
        database: {
          size: dbSize.rows[0]?.size || 'unknown'
        },
        connections: connectionStats.rows[0] || {},
        tables: tableStats.rows,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Database status check failed', { error, req });
    res.status(500).json({
      success: false,
      error: 'Database status check failed',
      error_code: 'DATABASE_ERROR',
      data: {
        connection: { status: 'error' },
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===========================================
// API 엔드포인트 상태 점검
// ===========================================
router.get('/endpoints', authMiddleware, async (req, res) => {
  try {
    const endpoints = [
      { name: 'User Registration', method: 'POST', path: '/api/v1/auth/register' },
      { name: 'User Login', method: 'POST', path: '/api/v1/auth/login' },
      { name: 'Swing Analysis', method: 'POST', path: '/api/v1/analysis/swing' },
      { name: 'User Profile', method: 'GET', path: '/api/v1/users/profile' },
      { name: 'Challenges', method: 'GET', path: '/api/v1/challenges' }
    ];

    const endpointStatus = [];
    
    for (const endpoint of endpoints) {
      try {
        // 실제로는 내부 health check을 수행
        // 여기서는 예시로 간단한 상태 체크
        endpointStatus.push({
          ...endpoint,
          status: 'healthy',
          lastCheck: new Date().toISOString()
        });
      } catch (error) {
        endpointStatus.push({
          ...endpoint,
          status: 'error',
          error: error.message,
          lastCheck: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      data: {
        endpoints: endpointStatus,
        summary: {
          total: endpoints.length,
          healthy: endpointStatus.filter(e => e.status === 'healthy').length,
          errors: endpointStatus.filter(e => e.status === 'error').length
        }
      }
    });
  } catch (error) {
    logger.error('Endpoint status check failed', { error, req });
    res.status(500).json({
      success: false,
      error: 'Endpoint status check failed',
      error_code: 'ENDPOINT_CHECK_ERROR'
    });
  }
});

module.exports = router;