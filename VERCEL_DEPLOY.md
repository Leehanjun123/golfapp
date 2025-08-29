# 🚀 Vercel 배포 가이드 - Golf AI Coach

## ✅ 준비 완료 상태
- ✅ Vercel 설정 파일 생성 (`vercel.json`)
- ✅ Serverless Functions 생성 (`/api` 폴더)
- ✅ Dependencies 설정 완료
- ✅ GitHub 저장소 업데이트 예정

## 📁 Vercel 프로젝트 구조
```
golfapp/
├── vercel.json          # Vercel 설정
├── package.json         # Dependencies
├── api/                 # Serverless Functions
│   ├── health.js        # 헬스 체크
│   ├── analyze-swing.js # 골프 스윙 분석
│   └── auth.js          # 인증 (로그인/회원가입)
└── apps/mobile/         # 기존 모바일 앱
```

## 🌐 Vercel 배포 방법

### 1. Vercel 계정 생성 (무료)
1. **https://vercel.com** 접속
2. **GitHub 계정으로 로그인**
3. 완전 무료 (100GB 대역폭/월)

### 2. 프로젝트 배포
1. **"New Project"** 클릭
2. **GitHub에서 `Leehanjun123/golfapp`** 선택
3. **Root Directory**: `/` (기본값)
4. **Framework Preset**: Other
5. **Deploy** 클릭 → 자동 빌드 시작

### 3. 환경 변수 설정 (Vercel Dashboard)
```bash
JWT_SECRET=golf-ai-vercel-secret-2025
NODE_ENV=production
```

## 📱 API 엔드포인트

배포 후 사용 가능한 API들:

### 🏥 헬스 체크
```bash
GET https://your-project.vercel.app/api/health
```

### 🔐 인증
```bash
POST https://your-project.vercel.app/api/auth/login
POST https://your-project.vercel.app/api/auth/register
GET https://your-project.vercel.app/api/auth/verify
```

### 🏌️ 스윙 분석
```bash
POST https://your-project.vercel.app/api/analyze-swing
```

## 🎯 배포 후 할 일

1. **도메인 확인**: Vercel이 자동 생성하는 URL 확인
2. **API 테스트**: `/api/health` 엔드포인트 테스트
3. **APK 업데이트**: 환경변수를 Vercel URL로 변경
4. **APK 재빌드**: 새로운 백엔드 URL로 빌드

## 💡 Vercel 장점
- ✅ **완전 무료** (개인 프로젝트)
- ✅ **자동 SSL** 인증서
- ✅ **CDN 글로벌 배포**
- ✅ **자동 스케일링**
- ✅ **GitHub 자동 배포**

---
🏌️‍♂️ **Golf AI Coach - Vercel 배포 준비 완료!**