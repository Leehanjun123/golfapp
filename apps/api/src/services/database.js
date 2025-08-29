// 새로운 PostgreSQL 데이터베이스 서비스
const models = require('../../models');

class DatabaseService {
  constructor() {
    this.models = models;
  }

  // 사용자 관련
  async createUser(userData) {
    try {
      const user = await this.models.User.create(userData);
      return { success: true, data: user };
    } catch (error) {
      console.error('사용자 생성 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await this.models.User.findOne({ 
        where: { email },
        attributes: { exclude: ['password'] }
      });
      return user;
    } catch (error) {
      console.error('사용자 조회 오류:', error);
      return null;
    }
  }

  async getUserById(id) {
    try {
      const user = await this.models.User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });
      return user;
    } catch (error) {
      console.error('사용자 조회 오류:', error);
      return null;
    }
  }

  async updateUser(id, updates) {
    try {
      const [updated] = await this.models.User.update(updates, {
        where: { id }
      });
      
      if (updated) {
        const user = await this.getUserById(id);
        return { success: true, data: user };
      }
      
      return { success: false, error: '사용자를 찾을 수 없습니다' };
    } catch (error) {
      console.error('사용자 업데이트 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // 스윙 분석 관련
  async createAnalysis(analysisData) {
    try {
      const analysis = await this.models.SwingAnalysis.create(analysisData);
      
      // 사용자 통계 업데이트
      const stats = await this.models.SwingAnalysis.getUserStats(analysisData.user_id);
      if (stats) {
        await this.models.User.update(
          { stats },
          { where: { id: analysisData.user_id } }
        );
      }
      
      return { success: true, data: analysis };
    } catch (error) {
      console.error('분석 저장 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async getAnalysesByUser(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, order = [['created_at', 'DESC']] } = options;
      
      const analyses = await this.models.SwingAnalysis.findAndCountAll({
        where: { user_id: userId },
        limit,
        offset,
        order
      });
      
      return {
        success: true,
        data: analyses.rows,
        total: analyses.count,
        limit,
        offset
      };
    } catch (error) {
      console.error('분석 목록 조회 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async getAnalysisById(id) {
    try {
      const analysis = await this.models.SwingAnalysis.findByPk(id, {
        include: [{
          model: this.models.User,
          as: 'user',
          attributes: ['id', 'email', 'name']
        }]
      });
      
      if (!analysis) {
        return { success: false, error: '분석을 찾을 수 없습니다' };
      }
      
      return { success: true, data: analysis };
    } catch (error) {
      console.error('분석 조회 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteAnalysis(id, userId) {
    try {
      const deleted = await this.models.SwingAnalysis.destroy({
        where: { id, user_id: userId }
      });
      
      if (deleted) {
        // 사용자 통계 업데이트
        const stats = await this.models.SwingAnalysis.getUserStats(userId);
        if (stats) {
          await this.models.User.update(
            { stats },
            { where: { id: userId } }
          );
        }
        
        return { success: true };
      }
      
      return { success: false, error: '분석을 찾을 수 없습니다' };
    } catch (error) {
      console.error('분석 삭제 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // 훈련 세션 관련
  async createTrainingSession(sessionData) {
    try {
      const session = await this.models.TrainingSession.create(sessionData);
      return { success: true, data: session };
    } catch (error) {
      console.error('훈련 세션 생성 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async getTrainingSessionsByUser(userId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const sessions = await this.models.TrainingSession.findAndCountAll({
        where: { user_id: userId },
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });
      
      return {
        success: true,
        data: sessions.rows,
        total: sessions.count
      };
    } catch (error) {
      console.error('훈련 세션 조회 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // 통계 관련
  async getUserStatistics(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: '사용자를 찾을 수 없습니다' };
      }
      
      // 최근 분석 통계
      const recentAnalyses = await this.models.SwingAnalysis.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: 30
      });
      
      // 월별 통계
      const monthlyStats = await this.models.sequelize.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count,
          AVG(score) as avg_score
        FROM swing_analyses
        WHERE user_id = :userId
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 6
      `, {
        replacements: { userId },
        type: this.models.Sequelize.QueryTypes.SELECT
      });
      
      // 단계별 분포
      const phaseDistribution = await this.models.SwingAnalysis.findAll({
        attributes: [
          'phase',
          [this.models.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: { user_id: userId },
        group: ['phase']
      });
      
      return {
        success: true,
        data: {
          user: user.stats,
          recent_analyses: recentAnalyses,
          monthly_stats: monthlyStats,
          phase_distribution: phaseDistribution
        }
      };
    } catch (error) {
      console.error('통계 조회 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // 데이터베이스 연결 상태
  async checkHealth() {
    try {
      await this.models.sequelize.authenticate();
      return { 
        success: true, 
        status: 'healthy',
        database: 'PostgreSQL',
        timestamp: new Date()
      };
    } catch (error) {
      return { 
        success: false, 
        status: 'unhealthy',
        error: error.message 
      };
    }
  }
}

module.exports = new DatabaseService();