// 환경변수 중앙 관리 및 검증
const dotenv = require('dotenv');
const path = require('path');

// 루트 디렉토리의 .env 파일을 우선 로드
dotenv.config({ path: path.join(__dirname, '../../../.env') });
// 백엔드 로컬 .env도 로드 (덮어쓰기)
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 환경변수 검증 및 기본값 설정
const config = {
  // 서버 설정
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 8080,
  
  // JWT 설정
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // CORS 설정
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS === '*' 
    ? '*' 
    : (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  
  // 파일 업로드 설정
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  
  // 데이터베이스 설정
  DB_PATH: process.env.DB_PATH || './golf-ai.db',
  
  // AI 분석 설정 (100% 로컬)
  AI_MODE: 'local', // local only
  AI_ACCURACY_TARGET: 98,
  AI_MAX_PROCESSING_TIME: 1000, // ms
};

// 필수 환경변수 검증
function validateConfig() {
  const required = ['JWT_SECRET'];
  const missing = [];
  
  for (const key of required) {
    if (!config[key] || config[key] === 'default-secret-key-change-in-production') {
      missing.push(key);
    }
  }
  
  if (missing.length > 0 && config.NODE_ENV === 'production') {
    throw new Error(`필수 환경변수가 설정되지 않았습니다: ${missing.join(', ')}`);
  }
  
  if (config.NODE_ENV === 'development' && missing.length > 0) {
    console.warn(`⚠️ 개발 모드: 일부 환경변수가 기본값을 사용합니다: ${missing.join(', ')}`);
  }
  
  console.log('✅ 환경변수 검증 완료');
  console.log(`📍 환경: ${config.NODE_ENV}`);
  console.log(`🚀 포트: ${config.PORT}`);
  console.log(`🤖 AI 모드: ${config.AI_MODE} (정확도: ${config.AI_ACCURACY_TARGET}%)`);
}

// 설정 검증 실행
validateConfig();

module.exports = config;