#!/usr/bin/env node

// SQLite에서 PostgreSQL로 데이터 마이그레이션
const sqlite3 = require('sqlite3').verbose();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// 환경변수 로드
require('dotenv').config();

// PostgreSQL 연결 설정
const pgSequelize = new Sequelize(
  process.env.DB_NAME || 'golf_ai_dev',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: console.log
  }
);

// SQLite 연결
const sqliteDb = new sqlite3.Database('./golf-ai.db');

// 모델 로드
const models = require('../models');

async function migrateUsers() {
  console.log('📤 사용자 데이터 마이그레이션 시작...');
  
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM users', async (err, rows) => {
      if (err) {
        console.error('SQLite 읽기 오류:', err);
        return reject(err);
      }
      
      if (!rows || rows.length === 0) {
        console.log('마이그레이션할 사용자가 없습니다.');
        return resolve();
      }
      
      console.log(`${rows.length}명의 사용자 발견`);
      
      for (const row of rows) {
        try {
          // 기존 사용자 확인
          const existingUser = await models.User.findOne({
            where: { email: row.email }
          });
          
          if (!existingUser) {
            await models.User.create({
              email: row.email,
              password: row.password, // 이미 해시됨
              name: row.name || null,
              handicap: row.handicap || null,
              skill_level: row.skill_level || 'intermediate',
              created_at: row.created_at ? new Date(row.created_at) : new Date(),
              updated_at: row.updated_at ? new Date(row.updated_at) : new Date()
            });
            console.log(`✅ 사용자 마이그레이션: ${row.email}`);
          } else {
            console.log(`⏭️ 이미 존재: ${row.email}`);
          }
        } catch (error) {
          console.error(`❌ 사용자 마이그레이션 실패 (${row.email}):`, error.message);
        }
      }
      
      resolve();
    });
  });
}

async function migrateAnalyses() {
  console.log('📤 스윙 분석 데이터 마이그레이션 시작...');
  
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM analyses', async (err, rows) => {
      if (err) {
        console.error('SQLite 읽기 오류:', err);
        return reject(err);
      }
      
      if (!rows || rows.length === 0) {
        console.log('마이그레이션할 분석 데이터가 없습니다.');
        return resolve();
      }
      
      console.log(`${rows.length}개의 분석 데이터 발견`);
      
      for (const row of rows) {
        try {
          // 사용자 찾기
          const user = await models.User.findOne({
            where: { id: row.user_id }
          });
          
          if (!user) {
            console.log(`⚠️ 사용자를 찾을 수 없음: ${row.user_id}`);
            continue;
          }
          
          // 메트릭스 파싱
          let metrics = {};
          let feedback = { priority: [], improvements: [], drills: [] };
          
          try {
            metrics = typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics;
          } catch (e) {
            console.log('메트릭스 파싱 실패, 기본값 사용');
          }
          
          try {
            feedback = typeof row.feedback === 'string' ? JSON.parse(row.feedback) : row.feedback;
          } catch (e) {
            console.log('피드백 파싱 실패, 기본값 사용');
          }
          
          await models.SwingAnalysis.create({
            user_id: user.id,
            score: row.score || 0,
            phase: row.phase || 'address',
            metrics: metrics,
            feedback: feedback,
            accuracy: row.accuracy || 98,
            processing_time: row.processing_time || 1,
            cost: 0,
            created_at: row.created_at ? new Date(row.created_at) : new Date(),
            updated_at: row.updated_at ? new Date(row.updated_at) : new Date()
          });
          
          console.log(`✅ 분석 데이터 마이그레이션 완료`);
        } catch (error) {
          console.error('❌ 분석 데이터 마이그레이션 실패:', error.message);
        }
      }
      
      resolve();
    });
  });
}

async function updateUserStats() {
  console.log('📊 사용자 통계 업데이트...');
  
  const users = await models.User.findAll();
  
  for (const user of users) {
    const stats = await models.SwingAnalysis.getUserStats(user.id);
    if (stats) {
      await user.update({ stats });
      console.log(`✅ ${user.email} 통계 업데이트 완료`);
    }
  }
}

async function main() {
  try {
    console.log('🚀 데이터베이스 마이그레이션 시작\n');
    
    // PostgreSQL 연결 테스트
    await pgSequelize.authenticate();
    console.log('✅ PostgreSQL 연결 성공\n');
    
    // 테이블 생성
    await pgSequelize.sync({ force: false });
    console.log('✅ 테이블 구조 동기화 완료\n');
    
    // 데이터 마이그레이션
    await migrateUsers();
    console.log('');
    
    await migrateAnalyses();
    console.log('');
    
    await updateUserStats();
    console.log('');
    
    console.log('🎉 마이그레이션 완료!');
    
    // 연결 종료
    sqliteDb.close();
    await pgSequelize.close();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}