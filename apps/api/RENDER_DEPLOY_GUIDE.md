# 🚀 Render.com 배포 가이드

## 📋 사전 준비
1. Render.com 계정 생성 (https://render.com)
2. GitHub 계정 연동
3. 이 프로젝트를 GitHub에 푸시

## 🔧 배포 단계

### 1️⃣ GitHub에 코드 푸시
```bash
cd /Users/leehanjun/Desktop/golfapp
git init
git add .
git commit -m "Initial commit for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/golfapp.git
git push -u origin main
```

### 2️⃣ Render Dashboard에서 새 서비스 생성

1. **New Web Service** 클릭
2. GitHub 저장소 연결
3. 설정:
   - **Name**: `golf-ai-backend`
   - **Runtime**: `Docker`
   - **Root Directory**: `apps/api`
   - **Dockerfile Path**: `./Dockerfile.render`
   - **Instance Type**: `Free`

### 3️⃣ 환경변수 설정

Render Dashboard > Environment에서 추가:
```
NODE_ENV=production
PORT=8080
CORS_ORIGIN=*
LOG_LEVEL=info
```

### 4️⃣ Database 설정 (선택사항)

1. **New PostgreSQL** 클릭
2. 설정:
   - **Name**: `golf-db`
   - **Database**: `golfapp`
   - **User**: `golfuser`
   - **Plan**: `Free`

3. 자동으로 `DATABASE_URL` 환경변수 생성됨

### 5️⃣ 배포 시작

1. **Manual Deploy** > **Deploy latest commit** 클릭
2. 빌드 로그 확인 (약 5-10분 소요)
3. 배포 완료 후 URL 확인: `https://golf-ai-backend.onrender.com`

## 🧪 배포 테스트

```bash
# API 헬스체크
curl https://golf-ai-backend.onrender.com/health

# AI 분석 테스트
curl -X POST https://golf-ai-backend.onrender.com/api/v1/golf/analyze-swing \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_image_data_here"}'
```

## 📱 앱 연결

`apps/mobile/config/env.ts` 수정:
```javascript
export default {
  API_URL: 'https://golf-ai-backend.onrender.com'
}
```

## ⚠️ 주의사항

### 무료 플랜 제한사항:
- **자동 슬립**: 15분 동안 요청이 없으면 슬립 (첫 요청시 30초 지연)
- **월 750시간**: 무료 실행 시간
- **빌드 시간**: 월 500분
- **대역폭**: 월 100GB

### 슬립 방지 (선택사항):
```javascript
// server.js에 추가
setInterval(() => {
  https.get('https://golf-ai-backend.onrender.com/health');
}, 14 * 60 * 1000); // 14분마다 핑
```

## 🎯 최적화 팁

1. **Docker 이미지 캐싱**: 
   - Python 패키지를 먼저 설치하여 캐시 활용

2. **헬스체크 추가**:
   - `/health` 엔드포인트로 서비스 상태 모니터링

3. **로그 관리**:
   - Render Dashboard에서 실시간 로그 확인

## 🔥 프로덕션 준비

무료 플랜으로 테스트 후, 트래픽 증가시:
- **Starter Plan** ($7/월): 슬립 없음, 더 많은 리소스
- **Auto-scaling**: 트래픽에 따라 자동 확장

## 📞 문제 해결

### Python 패키지 설치 실패:
```dockerfile
# Dockerfile.render에서 버전 명시
RUN pip install mediapipe==0.10.7
```

### 메모리 부족:
- Free 플랜은 512MB RAM
- 필요시 Starter 플랜으로 업그레이드

### CORS 에러:
```javascript
// server.js에서 CORS 설정 확인
app.use(cors({
  origin: '*', // 프로덕션에서는 특정 도메인으로 제한
}));
```

## ✅ 배포 완료 체크리스트

- [ ] GitHub에 코드 푸시
- [ ] Render에서 Web Service 생성
- [ ] 환경변수 설정
- [ ] 빌드 성공 확인
- [ ] Health check 통과
- [ ] API 엔드포인트 테스트
- [ ] 앱에서 API URL 업데이트
- [ ] Enhanced AI 분석 작동 확인

---
🎉 **배포 완료!** 이제 앱에서 Render 백엔드를 사용할 수 있습니다.