// 서버 워밍업 및 사전 로딩
const { spawn } = require('child_process');
const path = require('path');

class ServerWarmup {
  constructor() {
    this.pythonProcessPool = [];
    this.maxPoolSize = 2; // 미리 2개의 Python 프로세스 준비
    this.isWarmedUp = false;
  }
  
  async initialize() {
    console.log('🔥 서버 워밍업 시작...');
    const startTime = Date.now();
    
    try {
      // 1. Python 프로세스 풀 초기화
      await this.initializePythonPool();
      
      // 2. AI 모델 사전 로딩
      await this.preloadAIModels();
      
      // 3. 캐시 워밍
      await this.warmCache();
      
      // 4. 데이터베이스 연결 풀 준비
      await this.prepareDatabase();
      
      const duration = Date.now() - startTime;
      console.log(`✅ 서버 워밍업 완료 (${duration}ms)`);
      this.isWarmedUp = true;
      
      return true;
    } catch (error) {
      console.error('❌ 서버 워밍업 실패:', error);
      return false;
    }
  }
  
  // Python 프로세스 풀 초기화
  async initializePythonPool() {
    console.log('  📌 Python 프로세스 풀 초기화...');
    
    const testScript = path.join(__dirname, '../python/warmup_test.py');
    
    // 테스트 스크립트 생성
    const fs = require('fs');
    const testCode = `
import sys
import mediapipe as mp
from ultralytics import YOLO
import json

# 모듈 로딩
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True)

try:
    yolo = YOLO('yolov8n.pt')
    print(json.dumps({"success": True, "message": "Models loaded"}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;
    
    if (!fs.existsSync(testScript)) {
      fs.writeFileSync(testScript, testCode);
    }
    
    // 프로세스 풀 생성
    for (let i = 0; i < this.maxPoolSize; i++) {
      await this.createPythonProcess();
    }
    
    console.log(`    ✅ ${this.pythonProcessPool.length}개 프로세스 준비됨`);
  }
  
  // Python 프로세스 생성
  createPythonProcess() {
    return new Promise((resolve) => {
      const pythonPath = path.join(__dirname, '../python/warmup_test.py');
      const proc = spawn('python3', [pythonPath]);
      
      proc.stdout.once('data', (data) => {
        try {
          const result = JSON.parse(data.toString());
          if (result.success) {
            this.pythonProcessPool.push(proc);
            console.log(`    ✅ Python 프로세스 ${this.pythonProcessPool.length} 준비됨`);
          }
        } catch (e) {
          // 무시
        }
        resolve();
      });
      
      proc.stderr.once('data', () => {
        resolve();
      });
      
      // 타임아웃 설정
      setTimeout(() => {
        resolve();
      }, 5000);
    });
  }
  
  // AI 모델 사전 로딩
  async preloadAIModels() {
    console.log('  📌 AI 모델 사전 로딩...');
    
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    return new Promise((resolve) => {
      const scriptPath = path.join(__dirname, '../python/enhanced_golf_analyzer.py');
      const proc = spawn('python3', [scriptPath]);
      
      // 테스트 이미지 전송
      proc.stdin.write(testImage);
      proc.stdin.end();
      
      proc.stdout.once('data', () => {
        console.log('    ✅ AI 모델 로딩 완료');
        proc.kill();
        resolve();
      });
      
      proc.stderr.once('data', () => {
        console.log('    ⚠️ AI 모델 로딩 부분 실패');
        resolve();
      });
      
      // 타임아웃
      setTimeout(() => {
        proc.kill();
        resolve();
      }, 10000);
    });
  }
  
  // 캐시 워밍
  async warmCache() {
    console.log('  📌 캐시 워밍...');
    
    // 자주 사용되는 데이터 미리 캐싱
    const { analysisCache } = require('./smart-cache');
    
    if (analysisCache) {
      // 기본 응답 캐싱
      await analysisCache.set('default_error', {
        success: false,
        error: 'Service temporarily unavailable'
      }, 60000);
      
      console.log('    ✅ 캐시 워밍 완료');
    }
  }
  
  // 데이터베이스 연결 풀 준비
  async prepareDatabase() {
    console.log('  📌 데이터베이스 연결 풀 준비...');
    
    // 데이터베이스 헬스체크
    const { checkDatabaseHealth } = require('../database/database');
    
    try {
      const isHealthy = await checkDatabaseHealth();
      if (isHealthy) {
        console.log('    ✅ 데이터베이스 연결 준비됨');
      } else {
        console.log('    ⚠️ 데이터베이스 연결 실패');
      }
    } catch (error) {
      console.log('    ⚠️ 데이터베이스 확인 실패');
    }
  }
  
  // Python 프로세스 재사용
  getPythonProcess() {
    if (this.pythonProcessPool.length > 0) {
      const proc = this.pythonProcessPool.shift();
      // 새 프로세스 생성 (백그라운드)
      setImmediate(() => this.createPythonProcess());
      return proc;
    }
    return null;
  }
  
  // 정리
  cleanup() {
    for (const proc of this.pythonProcessPool) {
      try {
        proc.kill();
      } catch (e) {
        // 무시
      }
    }
    this.pythonProcessPool = [];
  }
}

// 싱글톤 인스턴스
const serverWarmup = new ServerWarmup();

// 프로세스 종료시 정리
process.on('exit', () => {
  serverWarmup.cleanup();
});

module.exports = serverWarmup;