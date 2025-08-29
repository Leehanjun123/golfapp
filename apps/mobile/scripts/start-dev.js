#!/usr/bin/env node

// Golf AI - Smart Development Startup Script

const { execSync, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('🚀 Golf AI Development Environment Setup');
console.log('=========================================');

/**
 * 현재 머신의 네트워크 IP 주소 감지
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // IPv4, 외부 접근 가능, 로컬호스트 아님
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  
  return 'localhost';
}

/**
 * 환경변수 파일 업데이트
 */
function updateEnvFile(ip) {
  const envPath = path.join(__dirname, '../../../.env');
  
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️ .env file not found, skipping IP update');
    return false;
  }

  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // IP 주소 업데이트
    envContent = envContent.replace(
      /EXPO_PUBLIC_FALLBACK_IP=.*/,
      `EXPO_PUBLIC_FALLBACK_IP=${ip}`
    );
    
    // API 호스트 업데이트 (localhost가 아닌 경우)
    if (ip !== 'localhost') {
      envContent = envContent.replace(
        /EXPO_PUBLIC_API_HOST=.*/,
        `EXPO_PUBLIC_API_HOST=${ip}`
      );
      
      envContent = envContent.replace(
        /EXPO_PUBLIC_API_URL=.*/,
        `EXPO_PUBLIC_API_URL=http://${ip}:8080`
      );
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated .env with IP: ${ip}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    return false;
  }
}

/**
 * 백엔드 서버 상태 확인
 */
async function checkBackendServer(ip = 'localhost') {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.get(`http://${ip}:8080/health`, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * 백엔드 서버 시작
 */
function startBackendServer() {
  console.log('🖥️ Starting backend server...');
  
  const backendPath = path.join(__dirname, '../../../apps/api');
  
  if (!fs.existsSync(backendPath)) {
    console.error('❌ Backend directory not found:', backendPath);
    return null;
  }

  try {
    // 백엔드 의존성 확인
    if (!fs.existsSync(path.join(backendPath, 'node_modules'))) {
      console.log('📦 Installing backend dependencies...');
      execSync('npm install', { cwd: backendPath, stdio: 'inherit' });
    }

    // 백엔드 서버 시작
    const backendProcess = spawn('npm', ['start'], {
      cwd: backendPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('running on') || output.includes('Server') || output.includes('listening')) {
        console.log('🖥️ Backend:', output.trim());
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (!error.includes('ExperimentalWarning') && !error.includes('Deprecation')) {
        console.error('🖥️ Backend Error:', error.trim());
      }
    });

    return backendProcess;
  } catch (error) {
    console.error('❌ Failed to start backend server:', error.message);
    return null;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  // 1. 네트워크 IP 감지
  const localIP = getLocalIP();
  console.log(`🌐 Detected local IP: ${localIP}`);
  
  // 2. 환경변수 업데이트
  updateEnvFile(localIP);
  
  // 3. 백엔드 서버 상태 확인
  console.log('🔍 Checking backend server...');
  let backendRunning = await checkBackendServer(localIP);
  
  if (!backendRunning && localIP !== 'localhost') {
    backendRunning = await checkBackendServer('localhost');
  }

  let backendProcess = null;
  
  if (!backendRunning) {
    console.log('🚀 Backend server not running, starting...');
    backendProcess = startBackendServer();
    
    if (backendProcess) {
      // 서버 시작 대기 (최대 30초)
      console.log('⏳ Waiting for backend server to start...');
      let attempts = 0;
      while (attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        backendRunning = await checkBackendServer('localhost');
        if (backendRunning) break;
        attempts++;
      }
    }
  }

  if (backendRunning) {
    console.log('✅ Backend server is ready');
  } else {
    console.warn('⚠️ Backend server not responding, but continuing...');
  }

  // 4. 모바일 앱 시작
  console.log('📱 Starting mobile app...');
  console.log('=====================================');
  console.log(`📊 Backend API: http://${localIP}:8080`);
  console.log(`📱 Mobile App: http://${localIP}:8081`);
  console.log('=====================================');

  // 모바일 앱 시작
  const mobileProcess = spawn('npx', ['expo', 'start', '--clear'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      EXPO_PUBLIC_API_HOST: localIP,
      EXPO_PUBLIC_API_URL: `http://${localIP}:8080`,
      EXPO_PUBLIC_FALLBACK_IP: localIP,
    }
  });

  // 종료 신호 처리
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development environment...');
    
    if (backendProcess) {
      backendProcess.kill('SIGINT');
    }
    
    mobileProcess.kill('SIGINT');
    process.exit(0);
  });

  // 에러 처리
  mobileProcess.on('error', (error) => {
    console.error('❌ Mobile app error:', error.message);
  });

  mobileProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Mobile app exited with code ${code}`);
    }
    
    if (backendProcess) {
      backendProcess.kill();
    }
  });
}

// 스크립트 실행
main().catch(error => {
  console.error('❌ Development setup failed:', error);
  process.exit(1);
});