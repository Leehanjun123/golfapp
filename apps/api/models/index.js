'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/database')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// 데이터베이스 연결 테스트
db.testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);
    return false;
  }
};

// 데이터베이스 초기화
db.initialize = async () => {
  try {
    // 개발 환경에서만 테이블 자동 생성
    if (env === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ 데이터베이스 테이블 동기화 완료');
    }
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    return false;
  }
};

module.exports = db;
