// Golf Pro API - Database Service Layer

const { query, transaction } = require('../database/postgresql');
const bcrypt = require('bcryptjs');

// ===========================================
// User Services
// ===========================================
const userService = {
  // 사용자 생성
  async createUser(userData) {
    const { email, username, password, name } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await query(`
      INSERT INTO users (email, username, password, name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, username, name, handicap, average_score, 
                drive_distance, total_rounds, created_at
    `, [email, username, hashedPassword, name || null]);
    
    return result.rows[0];
  },
  
  // 이메일로 사용자 조회
  async getUserByEmail(email) {
    const result = await query(`
      SELECT id, email, username, password, name, handicap, 
             average_score, drive_distance, total_rounds,
             profile_image, is_active, email_verified, created_at
      FROM users 
      WHERE email = $1 AND is_active = true
    `, [email]);
    
    return result.rows[0] || null;
  },
  
  // ID로 사용자 조회
  async getUserById(userId) {
    const result = await query(`
      SELECT id, email, username, name, handicap, 
             average_score, drive_distance, total_rounds,
             profile_image, is_active, email_verified, created_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [userId]);
    
    return result.rows[0] || null;
  },
  
  // 사용자 프로필 업데이트
  async updateUser(userId, updateData) {
    const allowedFields = ['name', 'handicap', 'average_score', 'drive_distance', 'profile_image'];
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (updates.length === 0) {
      throw new Error('업데이트할 데이터가 없습니다');
    }
    
    values.push(userId);
    
    const result = await query(`
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND is_active = true
      RETURNING id, email, username, name, handicap, 
                average_score, drive_distance, total_rounds, updated_at
    `, values);
    
    return result.rows[0] || null;
  },
  
  // 사용자 통계 조회
  async getUserStats(userId) {
    const result = await query(`
      SELECT 
        u.handicap,
        u.average_score,
        u.drive_distance,
        u.total_rounds,
        COUNT(sh.id) as total_analyses,
        AVG(sh.score) as avg_analysis_score,
        MAX(sh.score) as best_score,
        MIN(sh.score) as worst_score,
        COUNT(CASE WHEN sh.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_analyses
      FROM users u
      LEFT JOIN swing_history sh ON u.id = sh.user_id
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id, u.handicap, u.average_score, u.drive_distance, u.total_rounds
    `, [userId]);
    
    return result.rows[0] || null;
  }
};

// ===========================================
// Swing Analysis Services
// ===========================================
const swingService = {
  // 스윙 분석 결과 저장
  async saveSwingAnalysis(analysisData) {
    const {
      userId, score, postureScore, balanceScore, angleScore,
      feedback, improvements, poseData, imageData, videoData,
      processingTimeMs, aiModelVersion
    } = analysisData;
    
    const analysisMetadata = {
      method: 'local-ai',
      accuracy: '98%',
      timestamp: new Date().toISOString(),
      processingTimeMs
    };
    
    const result = await query(`
      INSERT INTO swing_history (
        user_id, score, posture_score, balance_score, angle_score,
        feedback, improvements, pose_data, image_data, video_data,
        analysis_metadata, processing_time_ms, ai_model_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, score, feedback, improvements, pose_data, created_at
    `, [
      userId, score, postureScore || null, balanceScore || null, angleScore || null,
      JSON.stringify(feedback || []), JSON.stringify(improvements || []),
      JSON.stringify(poseData), imageData || null, videoData || null,
      JSON.stringify(analysisMetadata), processingTimeMs || null, aiModelVersion || '1.0.0'
    ]);
    
    return result.rows[0];
  },
  
  // 사용자 스윙 히스토리 조회
  async getSwingHistory(userId, options = {}) {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = options;
    const offset = (page - 1) * limit;
    
    const allowedSortFields = ['created_at', 'score', 'processing_time_ms'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const result = await query(`
      SELECT 
        id, score, posture_score, balance_score, angle_score,
        feedback, improvements, pose_data, 
        analysis_metadata, processing_time_ms, ai_model_version,
        created_at
      FROM swing_history 
      WHERE user_id = $1
      ORDER BY ${sortField} ${order}
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
    
    // 총 개수 조회
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM swing_history 
      WHERE user_id = $1
    `, [userId]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: result.rows.map(row => ({
        ...row,
        feedback: JSON.parse(row.feedback || '[]'),
        improvements: JSON.parse(row.improvements || '[]'),
        pose_data: JSON.parse(row.pose_data || '{}'),
        analysis_metadata: JSON.parse(row.analysis_metadata || '{}')
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  },
  
  // 최고 스코어 조회
  async getBestScores(userId, limit = 10) {
    const result = await query(`
      SELECT 
        score, pose_data, feedback, created_at
      FROM swing_history 
      WHERE user_id = $1
      ORDER BY score DESC
      LIMIT $2
    `, [userId, limit]);
    
    return result.rows.map(row => ({
      ...row,
      pose_data: JSON.parse(row.pose_data || '{}'),
      feedback: JSON.parse(row.feedback || '[]')
    }));
  },
  
  // 스윙 분석 트렌드
  async getSwingTrends(userId, days = 30) {
    const result = await query(`
      SELECT 
        DATE(created_at) as analysis_date,
        COUNT(*) as count,
        AVG(score) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score
      FROM swing_history 
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY analysis_date DESC
    `, [userId]);
    
    return result.rows;
  }
};

// ===========================================
// Challenge Services
// ===========================================
const challengeService = {
  // 활성 챌린지 조회
  async getActiveChallenges(options = {}) {
    const { page = 1, limit = 20, type = null, difficulty = null } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE is_active = true AND end_date > CURRENT_TIMESTAMP';
    const queryParams = [];
    let paramCount = 0;
    
    if (type) {
      paramCount++;
      whereClause += ` AND challenge_type = $${paramCount}`;
      queryParams.push(type);
    }
    
    if (difficulty) {
      paramCount++;
      whereClause += ` AND difficulty = $${paramCount}`;
      queryParams.push(difficulty);
    }
    
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);
    
    const result = await query(`
      SELECT 
        c.*,
        COUNT(cp.user_id) as participant_count
      FROM challenges c
      LEFT JOIN challenge_participants cp ON c.id = cp.challenge_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.start_date DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, queryParams);
    
    return result.rows;
  },
  
  // 챌린지 참가
  async joinChallenge(userId, challengeId) {
    // 이미 참가했는지 확인
    const existingResult = await query(`
      SELECT id FROM challenge_participants 
      WHERE user_id = $1 AND challenge_id = $2
    `, [userId, challengeId]);
    
    if (existingResult.rows.length > 0) {
      throw new Error('이미 참가한 챌린지입니다');
    }
    
    // 챌린지 존재 확인
    const challengeResult = await query(`
      SELECT id, title, max_participants
      FROM challenges 
      WHERE id = $1 AND is_active = true AND end_date > CURRENT_TIMESTAMP
    `, [challengeId]);
    
    if (challengeResult.rows.length === 0) {
      throw new Error('존재하지 않거나 만료된 챌린지입니다');
    }
    
    const challenge = challengeResult.rows[0];
    
    // 참가자 수 확인
    if (challenge.max_participants) {
      const participantCountResult = await query(`
        SELECT COUNT(*) as count
        FROM challenge_participants 
        WHERE challenge_id = $1
      `, [challengeId]);
      
      const currentParticipants = parseInt(participantCountResult.rows[0].count);
      if (currentParticipants >= challenge.max_participants) {
        throw new Error('참가 인원이 마감되었습니다');
      }
    }
    
    // 참가 등록
    const result = await query(`
      INSERT INTO challenge_participants (challenge_id, user_id)
      VALUES ($1, $2)
      RETURNING id, progress, joined_at
    `, [challengeId, userId]);
    
    return {
      ...result.rows[0],
      challenge: {
        id: challenge.id,
        title: challenge.title
      }
    };
  },
  
  // 사용자 참가 챌린지 조회
  async getUserChallenges(userId) {
    const result = await query(`
      SELECT 
        c.id, c.title, c.description, c.challenge_type, c.difficulty,
        c.target_value, c.reward_title, c.start_date, c.end_date,
        cp.progress, cp.best_score, cp.completed_at, cp.joined_at
      FROM challenge_participants cp
      JOIN challenges c ON cp.challenge_id = c.id
      WHERE cp.user_id = $1
      ORDER BY cp.joined_at DESC
    `, [userId]);
    
    return result.rows;
  },
  
  // 챌린지 리더보드
  async getChallengeLeaderboard(challengeId, limit = 20) {
    const result = await query(`
      SELECT 
        u.username, u.name,
        cp.progress, cp.best_score, cp.completed_at,
        RANK() OVER (ORDER BY cp.best_score DESC, cp.completed_at ASC) as rank
      FROM challenge_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.challenge_id = $1 AND u.is_active = true
      ORDER BY rank
      LIMIT $2
    `, [challengeId, limit]);
    
    return result.rows;
  }
};

// ===========================================
// Export Services
// ===========================================
module.exports = {
  userService,
  swingService,
  challengeService
};