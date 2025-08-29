// User 모델
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    handicap: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 54
      }
    },
    skill_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'pro'),
      defaultValue: 'intermediate'
    },
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        hand: 'right',
        notification: true,
        language: 'ko'
      }
    },
    stats: {
      type: DataTypes.JSONB,
      defaultValue: {
        total_analyses: 0,
        average_score: 0,
        best_score: 0,
        improvement_rate: 0
      }
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['created_at'] }
    ]
  });

  User.associate = function(models) {
    User.hasMany(models.SwingAnalysis, {
      foreignKey: 'user_id',
      as: 'analyses'
    });
    User.hasMany(models.TrainingSession, {
      foreignKey: 'user_id',
      as: 'training_sessions'
    });
  };

  return User;
};