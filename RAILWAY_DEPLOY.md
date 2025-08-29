# 🚂 Railway 백엔드 배포 가이드

## 🎯 준비 완료 상태
- ✅ Railway 설정 파일 생성됨
- ✅ GitHub 저장소 업데이트됨  
- ✅ 프로덕션 환경 변수 설정됨

## 📋 Railway 배포 단계

### 1. Railway 계정 생성
1. https://railway.app 방문
2. GitHub 계정으로 로그인
3. "New Project" 클릭

### 2. GitHub 연동 배포
1. "Deploy from GitHub repo" 선택
2. `Leehanjun123/golfapp` 저장소 선택
3. Root directory: `/` (기본값)
4. Build command: `cd apps/api && npm install` 
5. Start command: `cd apps/api && npm start`

### 3. 환경 변수 설정 (Railway Dashboard)
```bash
NODE_ENV=production
PORT=8080
JWT_SECRET=golf-ai-production-secret-2025
DATABASE_URL=./data/golf_ai.db
ALLOWED_ORIGINS=https://your-railway-domain.railway.app
```

### 4. 도메인 확인
- Railway가 자동으로 도메인 생성 (예: `golfapp-production.railway.app`)
- 생성된 도메인을 APK 환경변수에 업데이트 필요

## 🔧 핵심 설정 파일

### `railway.json`
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd apps/api && npm start"
  }
}
```

### `apps/api/railway.toml`
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
```

## 🌐 배포 후 확인사항
1. Health check: `https://your-domain.railway.app/health`
2. API 테스트: `https://your-domain.railway.app/api/v1/health`
3. 로그 확인: Railway Dashboard에서 로그 모니터링

## 📱 APK 업데이트 필요
Railway 배포 완료 후 APK의 API_BASE_URL을 Railway 도메인으로 업데이트해야 합니다.

---
🏌️‍♂️ **Golf AI Coach - Railway 배포 준비 완료!**