// Golf Pro API - PostgreSQL Database Configuration

const { Pool } = require('pg');
const config = require('../config/env');

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  host: config.DATABASE.HOST,
  port: config.DATABASE.PORT,
  database: config.DATABASE.NAME,
  user: config.DATABASE.USER,
  password: config.DATABASE.PASSWORD,
  
  // 연결 풀 설정
  min: 2,                    // 최소 연결 수
  max: 20,                   // 최대 연결 수
  idleTimeoutMillis: 30000,  // 유휴 연결 타임아웃 (30초)
  connectionTimeoutMillis: 2000, // 연결 타임아웃 (2초)
  
  // SSL 설정 (프로덕션에서는 true)
  ssl: config.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// 연결 테스트
pool.on('connect', () => {
  console.log('✅ PostgreSQL 연결 성공');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 연결 오류:', err);
});

// 쿼리 실행 헬퍼 함수
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // 성능 로깅 (개발 모드)
    if (config.NODE_ENV === 'development') {
      console.log(`🔍 SQL Query: ${text} | Duration: ${duration}ms | Rows: ${res.rowCount}`);
    }
    
    return res;
  } catch (error) {
    console.error('❌ SQL 쿼리 오류:', {
      query: text,
      params,
      error: error.message
    });
    throw error;
  }
};

// 트랜잭션 헬퍼
const transaction = async (queries) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const { text, params } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// 데이터베이스 초기화 (테이블 생성)
const initializeDatabase = async () => {
  console.log('🚀 데이터베이스 초기화 시작...');
  
  try {
    // Users 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name VARCHAR(255),
        handicap INTEGER DEFAULT 20 CHECK (handicap >= -10 AND handicap <= 54),
        average_score DECIMAL(5,2) DEFAULT 100.00,
        drive_distance DECIMAL(5,1) DEFAULT 200.0,
        total_rounds INTEGER DEFAULT 0,
        profile_image TEXT,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Swing History 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS swing_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
        posture_score DECIMAL(5,2),
        balance_score DECIMAL(5,2),
        angle_score DECIMAL(5,2),
        feedback JSONB,
        improvements JSONB,
        pose_data JSONB NOT NULL,
        image_data TEXT,
        video_data TEXT,
        analysis_metadata JSONB,
        processing_time_ms INTEGER,
        ai_model_version VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Challenges 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        challenge_type VARCHAR(50) NOT NULL CHECK (challenge_type IN ('accuracy', 'distance', 'consistency', 'technique', 'daily_practice')),
        difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'professional')),
        duration_days INTEGER DEFAULT 7,
        target_metric VARCHAR(100),
        target_value DECIMAL(10,2),
        reward_title VARCHAR(255),
        reward_description TEXT,
        max_participants INTEGER,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Challenge Participants 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS challenge_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        progress DECIMAL(5,2) DEFAULT 0.00,
        best_score DECIMAL(5,2),
        completed_at TIMESTAMP WITH TIME ZONE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(challenge_id, user_id)
      )
    `);

    // Friends 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS friends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(user_id, friend_id),
        CHECK (user_id != friend_id)
      )
    `);

    // Goals 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('score_improvement', 'distance_increase', 'consistency', 'frequency')),
        target_value DECIMAL(10,2) NOT NULL,
        current_value DECIMAL(10,2) DEFAULT 0.00,
        target_date DATE,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 인덱스 생성
    console.log('📊 인덱스 생성 중...');
    
    const indexes = [
      // 성능 최적화용 인덱스
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true',
      
      'CREATE INDEX IF NOT EXISTS idx_swing_history_user_created ON swing_history(user_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_swing_history_score ON swing_history(score DESC)',
      'CREATE INDEX IF NOT EXISTS idx_swing_history_created ON swing_history(created_at DESC)',
      
      'CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active) WHERE is_active = true',
      'CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(challenge_type)',
      'CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date)',
      
      'CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id)',
      'CREATE INDEX IF NOT EXISTS idx_challenge_participants_score ON challenge_participants(best_score DESC)',
      
      'CREATE INDEX IF NOT EXISTS idx_friends_user_status ON friends(user_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_friends_friend_status ON friends(friend_id, status)',
      
      'CREATE INDEX IF NOT EXISTS idx_goals_user_active ON goals(user_id) WHERE is_completed = false',
      'CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(goal_type)',
      'CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date)'
    ];

    for (const indexQuery of indexes) {
      await query(indexQuery);
    }

    // 트리거 함수 생성 (updated_at 자동 업데이트)
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 트리거 생성
    const triggers = [
      'CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
    ];

    for (const triggerQuery of triggers) {
      try {
        await query(triggerQuery);
      } catch (error) {
        // 트리거가 이미 존재하는 경우 무시
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    console.log('✅ 데이터베이스 초기화 완료');
    
    // 통계 정보
    const stats = await query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples
      FROM pg_stat_user_tables 
      ORDER BY tablename
    `);
    
    console.log('📈 테이블 통계:', stats.rows);
    
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    throw error;
  }
};

// 연결 종료
const closeConnection = async () => {
  try {
    await pool.end();
    console.log('✅ PostgreSQL 연결 종료');
  } catch (error) {
    console.error('❌ 연결 종료 오류:', error);
  }
};

// 헬스체크
const healthCheck = async () => {
  try {
    const result = await query('SELECT NOW() as current_time, version()');
    return {
      healthy: true,
      timestamp: result.rows[0].current_time,
      version: result.rows[0].version,
      activeConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

module.exports = {
  query,
  transaction,
  initializeDatabase,
  closeConnection,
  healthCheck,
  pool
};