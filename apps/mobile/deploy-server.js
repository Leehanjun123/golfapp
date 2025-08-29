const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// 정적 파일 제공
app.use(express.static('dist'));
app.use(express.static('public'));

// 홈페이지
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Golf AI Coach - 다운로드</title>
  <link rel="manifest" href="/manifest.json">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: white;
    }
    .container {
      max-width: 600px;
      width: 100%;
      text-align: center;
    }
    .logo {
      font-size: 80px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 36px;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 18px;
      opacity: 0.9;
      margin-bottom: 40px;
    }
    .card {
      background: white;
      color: #333;
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .features {
      text-align: left;
      margin: 20px 0;
    }
    .feature {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .feature:last-child {
      border-bottom: none;
    }
    .btn {
      display: inline-block;
      padding: 15px 40px;
      background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-size: 18px;
      font-weight: bold;
      margin: 10px;
      transition: transform 0.2s;
    }
    .btn:hover {
      transform: scale(1.05);
    }
    .btn-secondary {
      background: #757575;
    }
    .install-steps {
      background: rgba(255,255,255,0.1);
      border-radius: 15px;
      padding: 20px;
      margin-top: 30px;
      text-align: left;
    }
    .step {
      margin: 10px 0;
    }
    .api-status {
      display: inline-block;
      padding: 5px 15px;
      background: #4CAF50;
      color: white;
      border-radius: 20px;
      font-size: 14px;
      margin-top: 20px;
    }
    .api-status.offline {
      background: #f44336;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🏌️</div>
    <h1>Golf AI Coach</h1>
    <p class="subtitle">AI 기반 실시간 골프 스윙 분석</p>
    
    <div class="card">
      <h2 style="margin-bottom: 20px;">✨ 주요 기능</h2>
      <div class="features">
        <div class="feature">🤖 94% 정확도의 AI 스윙 분석</div>
        <div class="feature">📹 실시간 동영상 피드백</div>
        <div class="feature">📊 상세한 분석 리포트</div>
        <div class="feature">🎯 개인 맞춤 훈련 프로그램</div>
        <div class="feature">🏆 도전 과제 및 리더보드</div>
      </div>
      
      <a href="http://localhost:8082" class="btn">🚀 웹 앱 시작하기</a>
      <a href="#install" class="btn btn-secondary">📱 모바일 설치 가이드</a>
    </div>
    
    <div class="install-steps" id="install">
      <h3 style="margin-bottom: 15px;">📱 모바일 설치 방법</h3>
      <div class="step">1️⃣ 모바일 브라우저에서 이 페이지 접속</div>
      <div class="step">2️⃣ Chrome: 메뉴 → "홈 화면에 추가"</div>
      <div class="step">3️⃣ Safari: 공유 버튼 → "홈 화면에 추가"</div>
      <div class="step">4️⃣ 설치 완료! 앱처럼 사용 가능</div>
    </div>
    
    <div class="api-status" id="api-status">
      🔌 백엔드 서버: 연결 확인 중...
    </div>
  </div>
  
  <script>
    // API 상태 확인
    fetch('https://golfai.loca.lt/api/v1/health')
      .then(res => res.ok ? '✅ 온라인' : '❌ 오프라인')
      .catch(() => '❌ 오프라인')
      .then(status => {
        document.getElementById('api-status').innerHTML = '🔌 백엔드 서버: ' + status;
        document.getElementById('api-status').className = status.includes('온라인') ? 'api-status' : 'api-status offline';
      });
      
    // PWA 설치 프롬프트
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });
  </script>
</body>
</html>
  `);
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`
🏌️ Golf AI Coach 배포 서버 시작!
====================================
📱 로컬 접속: http://localhost:${PORT}
🌐 외부 접속: localtunnel로 공유 필요
   명령어: npx localtunnel --port ${PORT}
   
✅ 백엔드 API: https://golfai.loca.lt
📲 웹 앱: http://localhost:8082
  `);
});