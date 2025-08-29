// TrainingSession 모델
module.exports = (sequelize, DataTypes) => {
  const TrainingSession = sequelize.define('TrainingSession', {
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
    session_type: {
      type: DataTypes.ENUM('practice', 'lesson', 'tournament', 'casual'),
      defaultValue: 'practice'
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    goals: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    achievements: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    drill_results: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    overall_score: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 100
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    coach_feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    weather: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'training_sessions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['created_at'] },
      { fields: ['session_type'] }
    ]
  });

  TrainingSession.associate = function(models) {
    TrainingSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return TrainingSession;
};