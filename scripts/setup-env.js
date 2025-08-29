#!/usr/bin/env node

// Golf AI - Environment Setup Script

const os = require('os');
const fs = require('fs');
const path = require('path');

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
 * .env 파일의 IP 주소 업데이트
 */
function updateEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  const localIP = getLocalIP();
  
  console.log(`🌐 Detected IP: ${localIP}`);
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    return false;
  }

  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // IP 주소 관련 환경변수 업데이트
    const updates = [
      [`EXPO_PUBLIC_FALLBACK_IP=.*`, `EXPO_PUBLIC_FALLBACK_IP=${localIP}`],
      [`EXPO_PUBLIC_API_HOST=.*`, `EXPO_PUBLIC_API_HOST=${localIP}`],
      [`EXPO_PUBLIC_API_URL=.*`, `EXPO_PUBLIC_API_URL=http://${localIP}:8080`],
    ];

    updates.forEach(([pattern, replacement]) => {
      const regex = new RegExp(pattern);
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, replacement);
        console.log(`✅ Updated: ${replacement}`);
      } else {
        // 환경변수가 없으면 추가
        envContent += `\n${replacement}`;
        console.log(`➕ Added: ${replacement}`);
      }
    });
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Environment file updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    return false;
  }
}

/**
 * app.json IP 주소 업데이트 (iOS ATS 설정)
 */
function updateAppJson() {
  const appJsonPath = path.join(__dirname, '../apps/mobile/app.json');
  const localIP = getLocalIP();
  
  if (!fs.existsSync(appJsonPath)) {
    console.warn('⚠️ app.json not found, skipping update');
    return false;
  }

  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // iOS ATS 설정에 현재 IP 추가
    if (appJson.expo?.ios?.infoPlist?.NSAppTransportSecurity?.NSExceptionDomains) {
      const domains = appJson.expo.ios.infoPlist.NSAppTransportSecurity.NSExceptionDomains;
      
      // 새로운 IP 도메인 추가
      domains[localIP] = {
        NSExceptionAllowsInsecureHTTPLoads: true,
        NSIncludesSubdomains: true
      };
      
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
      console.log(`✅ Updated app.json with IP: ${localIP}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to update app.json:', error.message);
    return false;
  }
  
  return false;
}

/**
 * 네트워크 진단 정보 출력
 */
function printNetworkDiagnosis() {
  const interfaces = os.networkInterfaces();
  
  console.log('\n📊 Network Diagnosis:');
  console.log('=====================');
  
  Object.keys(interfaces).forEach(name => {
    const nets = interfaces[name];
    nets.forEach(net => {
      if (net.family === 'IPv4') {
        const status = net.internal ? '🏠 Internal' : '🌐 External';
        console.log(`${status} ${name}: ${net.address}`);
      }
    });
  });
  
  console.log('=====================\n');
}

/**
 * 메인 실행 함수
 */
function main() {
  console.log('🚀 Golf AI Environment Setup');
  console.log('============================');
  
  printNetworkDiagnosis();
  
  const envUpdated = updateEnvFile();
  const appJsonUpdated = updateAppJson();
  
  if (envUpdated || appJsonUpdated) {
    console.log('\n✅ Environment setup completed successfully!');
    console.log('\n📝 Quick Start:');
    console.log('  npm run dev:smart    # Smart development with auto-detection');
    console.log('  npm run mobile:dev   # Mobile app only');
    console.log('  npm run api:start    # Backend server only');
  } else {
    console.log('\n⚠️ Environment setup completed with warnings');
  }
}

// 스크립트가 직접 실행될 때만 main 실행
if (require.main === module) {
  main();
}

module.exports = { getLocalIP, updateEnvFile, updateAppJson };