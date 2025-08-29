// SwingAnalysis 모델
module.exports = (sequelize, DataTypes) => {
  const SwingAnalysis = sequelize.define('SwingAnalysis', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    video_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    thumbnail_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    phase: {
      type: DataTypes.ENUM(
        'address', 'takeaway', 'backswing', 'top', 
        'downswing', 'impact', 'follow_through', 'finish'
      ),
      allowNull: false
    },
    metrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    keypoints: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    feedback: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        priority: [],
        improvements: [],
        drills: []
      }
    },
    comparison_data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    club_type: {
      type: DataTypes.STRING,
      defaultValue: 'driver'
    },
    weather_conditions: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    accuracy: {
      type: DataTypes.FLOAT,
      defaultValue: 98
    },
    processing_time: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    cost: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0
    },
    is_favorite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'swing_analyses',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['created_at'] },
      { fields: ['score'] },
      { fields: ['phase'] },
      { fields: ['is_favorite'] }
    ]
  });

  SwingAnalysis.associate = function(models) {
    SwingAnalysis.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  // 통계 메서드
  SwingAnalysis.getUserStats = async function(userId) {
    const analyses = await this.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 100
    });

    if (analyses.length === 0) {
      return null;
    }

    const scores = analyses.map(a => a.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore = Math.max(...scores);
    
    // 개선 추세 계산 (최근 10개 vs 이전 10개)
    const recent = scores.slice(0, 10);
    const previous = scores.slice(10, 20);
    
    let improvementRate = 0;
    if (previous.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
      improvementRate = ((recentAvg - previousAvg) / previousAvg) * 100;
    }

    return {
      total_analyses: analyses.length,
      average_score: Math.round(avgScore),
      best_score: bestScore,
      improvement_rate: Math.round(improvementRate * 10) / 10
    };
  };

  return SwingAnalysis;
};