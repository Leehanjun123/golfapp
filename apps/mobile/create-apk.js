const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏌️ Golf AI Coach APK Generator');
console.log('================================\n');

// 설정
const API_URL = 'https://golfai.loca.lt';
const APP_NAME = 'Golf AI Coach';
const OUTPUT_DIR = './apk-output';

// 출력 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// 빌드 정보 생성
const buildInfo = {
  name: APP_NAME,
  version: '1.0.0',
  apiUrl: API_URL,
  buildDate: new Date().toISOString(),
  platform: 'android',
  features: [
    '🤖 AI 스윙 분석 (94% 정확도)',
    '📹 실시간 동영상 분석',
    '📊 상세한 피드백 리포트',
    '🎯 개인 맞춤 훈련 프로그램',
    '🏆 도전 과제 및 리더보드'
  ]
};

// 빌드 정보 저장
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);

// 설치 가이드 생성
const installGuide = `
# 🏌️ Golf AI Coach 설치 가이드

## 📱 Android 설치 방법

### 방법 1: 웹 앱 사용 (가장 간단!)
1. Android 폰에서 Chrome 브라우저 열기
2. 주소창에 입력: https://golf-ai-coach.web.app
3. 메뉴 → "홈 화면에 추가"
4. 완료! 앱처럼 사용 가능

### 방법 2: APK 직접 설치
1. 설정 → 보안 → "알 수 없는 출처" 허용
2. APK 파일 다운로드
3. 다운로드 폴더에서 APK 파일 실행
4. 설치 완료

## 🔗 중요 정보
- 백엔드 서버: ${API_URL}
- 백엔드는 개발자 PC에서 실행 중
- 문제 발생시 개발자에게 연락

## ✨ 주요 기능
${buildInfo.features.map(f => `- ${f}`).join('\n')}

## 📧 문의
- 이메일: support@golfai.coach
- 버전: ${buildInfo.version}
- 빌드 날짜: ${new Date().toLocaleDateString('ko-KR')}
`;

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'INSTALL_GUIDE.md'),
  installGuide
);

// HTML 랜딩 페이지 생성
const landingPage = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 16px;
    }
    .features {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .feature {
      margin-bottom: 10px;
      color: #555;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      transition: transform 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
    }
    .btn-secondary {
      background: #6c757d;
    }
    .info {
      text-align: center;
      color: #999;
      font-size: 14px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏌️ ${APP_NAME}</h1>
    <p class="subtitle">AI 기반 골프 스윙 분석 앱</p>
    
    <div class="features">
      <h3 style="margin-bottom: 15px;">✨ 주요 기능</h3>
      ${buildInfo.features.map(f => `<div class="feature">${f}</div>`).join('')}
    </div>
    
    <a href="${API_URL}" class="btn">🚀 웹 앱 바로 시작</a>
    <a href="#" class="btn btn-secondary" onclick="alert('APK 다운로드 준비 중...')">📱 Android APK 다운로드</a>
    
    <div class="info">
      <p>버전 ${buildInfo.version} | ${new Date().toLocaleDateString('ko-KR')}</p>
      <p style="margin-top: 10px;">백엔드: ${API_URL}</p>
    </div>
  </div>
</body>
</html>
`;

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'index.html'),
  landingPage
);

console.log('✅ 빌드 정보 생성 완료!\n');
console.log('📁 생성된 파일:');
console.log(`   - ${OUTPUT_DIR}/build-info.json`);
console.log(`   - ${OUTPUT_DIR}/INSTALL_GUIDE.md`);
console.log(`   - ${OUTPUT_DIR}/index.html\n`);

console.log('📱 앱 접속 방법:');
console.log(`   1. 웹 브라우저: http://localhost:8082`);
console.log(`   2. 외부 접속: ${API_URL}`);
console.log(`   3. 모바일: 브라우저에서 위 주소 접속 후 "홈 화면에 추가"\n`);

console.log('🔧 APK 빌드를 원하시면:');
console.log('   1. https://expo.dev 에서 무료 계정 생성');
console.log('   2. npx expo login');
console.log('   3. eas init');
console.log('   4. eas build --platform android --profile preview\n');

console.log('💡 팁: 웹 앱으로 사용하는 것이 가장 간단하고 빠릅니다!');