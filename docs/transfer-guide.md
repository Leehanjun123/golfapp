# 🏌️ Golf AI 프로젝트 이전 가이드
## Windows → Mac 완벽 가이드

---

## 📦 압축 파일 구성

### 1. **GolfAIApp_code.tar.gz (11KB)**
**포함 내용:**
```
GolfAIApp/
├── App.tsx                    # 메인 앱 (네비게이션 설정)
├── screens/
│   ├── HomeScreen.tsx         # 홈 화면
│   ├── ProComparisonScreen.tsx # 프로 골퍼 비교 (Phase 1)
│   ├── AICoachScreen.tsx      # AI 코치 채팅 (Phase 1)
│   ├── ChallengesScreen.tsx   # 소셜 챌린지 (Phase 1)
│   └── ProfileScreen.tsx      # 프로필 화면
└── config/
    └── api.ts                 # API 엔드포인트 설정
```

### 2. **GolfAIApp_config.tar.gz (832B)**
**포함 내용:**
```
GolfAIApp/
├── package.json      # 의존성 목록
├── tsconfig.json     # TypeScript 설정
└── app.json         # Expo 설정
```

### 3. **HealthcareAI_api.tar.gz (233KB)**
**포함 내용:**
```
HealthcareAI/backend/
├── main.py                    # FastAPI 서버 시작점
├── requirements.txt           # Python 패키지 목록
└── app/
    ├── api/v1/
    │   ├── endpoints/
    │   │   ├── pro_comparison.py  # 프로 비교 API
    │   │   ├── ai_coach.py        # AI 코치 API
    │   │   └── social_challenges.py # 챌린지 API
    │   └── api.py                 # API 라우터
    ├── models/                    # DB 모델
    ├── schemas/                   # Pydantic 스키마
    └── services/                  # 비즈니스 로직
```

### 4. **HealthcareAI_ai.tar.gz (5KB)**
**포함 내용:**
```
HealthcareAI/
├── fast_golf_ai.py          # 빠른 목업 AI (개발용)
└── deploy_ultimate_golf.py  # 실제 Golf AI 모델 (4개 앙상블)
```

---

## 🍎 Mac에서 복원 및 실행

### Step 1: 파일 다운로드 및 압축 해제
```bash
# Downloads 폴더에서 작업
cd ~/Downloads

# 모든 tar.gz 파일 압축 해제
tar -xzf GolfAIApp_code.tar.gz
tar -xzf GolfAIApp_config.tar.gz
tar -xzf HealthcareAI_api.tar.gz
tar -xzf HealthcareAI_ai.tar.gz

# 폴더 구조 확인
ls -la GolfAIApp/
ls -la HealthcareAI/
```

### Step 2: 모바일 앱 설정 (GolfAIApp)
```bash
# GolfAIApp 폴더로 이동
cd GolfAIApp

# Node.js 패키지 설치 (package.json 기반)
npm install

# Expo 개발 서버 시작
npx expo start

# 실행 후:
# - QR 코드가 터미널에 표시됨
# - iPhone: Expo Go 앱에서 QR 스캔
# - Android: Expo Go 앱에서 QR 스캔
```

### Step 3: 백엔드 서버 설정 (HealthcareAI)
```bash
# 새 터미널 열기
cd ~/Downloads/HealthcareAI

# AI 파일들을 backend 폴더로 이동
mv fast_golf_ai.py backend/
mv deploy_ultimate_golf.py backend/

# backend 폴더로 이동
cd backend

# Python 가상환경 생성 (권장)
python3 -m venv venv
source venv/bin/activate  # Mac/Linux

# Python 패키지 설치
pip install -r requirements.txt

# FastAPI 서버 시작
python main.py

# 서버 확인: http://localhost:8000/docs
```

---

## 🔧 현재 프로젝트 상태

### ✅ 구현 완료된 기능
1. **프로 골퍼 비교 (Phase 1)**
   - Tiger Woods, Rory McIlroy 등과 스윙 비교
   - 유사도 점수 계산
   - 개선점 제시

2. **AI 코치 (Phase 1)**
   - 4가지 성격 (격려형, 분석형, 친근형, 엄격형)
   - 실시간 채팅 인터페이스
   - 맞춤형 조언 제공

3. **소셜 챌린지 (Phase 1)**
   - 실시간 리더보드
   - 도전 과제 시스템
   - 배지 및 포인트

4. **Fast Golf AI**
   - 즉시 응답 (<1ms)
   - 개발 테스트용 mock 데이터

### ⚠️ 주의사항
- **API 연결**: 현재 모바일 앱은 mock 데이터 사용 중
- **IP 주소 변경 필요**: Mac의 IP로 변경 필요
  ```typescript
  // GolfAIApp/config/api.ts 수정
  const API_BASE_URL = 'http://[Mac-IP]:8000/api/v1';
  ```

---

## 🚀 계속 개발하기

### 다음 단계 작업
1. **API 실제 연결**
   ```typescript
   // screens/ProComparisonScreen.tsx에서
   // Mock 데이터 대신 실제 API 호출로 변경
   const response = await fetch(`${API_BASE_URL}/golf/pro-comparison`, {
     method: 'POST',
     body: formData
   });
   ```

2. **Golf AI 모델 통합**
   - TensorFlow 모델 로드
   - 실제 스윙 분석 구현

3. **데이터베이스 연결**
   - PostgreSQL 설정
   - 사용자 데이터 저장

### 테스트 방법
```bash
# API 테스트
curl http://localhost:8000/api/v1/golf/pro-comparison

# 모바일 앱 테스트
# 1. Expo Go 앱 설치
# 2. 같은 WiFi 연결
# 3. QR 코드 스캔
```

---

## 📝 핵심 파일 위치

### 프론트엔드 (React Native)
- **메인 앱**: `GolfAIApp/App.tsx`
- **프로 비교**: `GolfAIApp/screens/ProComparisonScreen.tsx`
- **AI 코치**: `GolfAIApp/screens/AICoachScreen.tsx`
- **챌린지**: `GolfAIApp/screens/ChallengesScreen.tsx`

### 백엔드 (FastAPI)
- **서버 시작**: `HealthcareAI/backend/main.py`
- **API 라우트**: `HealthcareAI/backend/app/api/v1/api.py`
- **Golf AI**: `HealthcareAI/backend/deploy_ultimate_golf.py`

---

## 💡 문제 해결

### 포트 충돌 시
```bash
# Expo 포트 변경
npx expo start --port 19001

# FastAPI 포트 변경
uvicorn main:app --port 8001
```

### 패키지 설치 오류 시
```bash
# Node.js 캐시 정리
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Python 패키지 업데이트
pip install --upgrade pip
pip install -r requirements.txt --upgrade
```

---

## 📞 연락처 및 참고

- **프로젝트 구조**: Expo + FastAPI
- **주요 기술**: React Native, TypeScript, Python, TensorFlow
- **Phase 1 기능**: 프로 비교, AI 코치, 소셜 챌린지
- **개발 환경**: Mac에서 iOS/Android 동시 개발 가능

---

**작성일**: 2025-08-26
**프로젝트**: Golf AI Coach
**상태**: Phase 1 구현 완료, API 연결 대기