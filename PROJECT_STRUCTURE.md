# 📁 Golf AI App - 프로젝트 구조

## 🎯 클린 코드 구조로 리팩토링 완료!

### 변경 전 → 변경 후

| 이전 파일명 | 새 파일명 | 설명 |
|------------|-----------|------|
| `GolfAIApp 2/` | `frontend/` | React Native 앱 |
| `HealthcareAI 2/` | `backend-services/` | FastAPI 서버 |
| `main_simple.py` | `server.py` | 메인 서버 파일 |
| `init_app.sh` | `setup.sh` | 초기 설정 스크립트 |
| `start.sh` | `run.sh` | 실행 스크립트 |
| `GOLF_AI_TRANSFER_GUIDE.md` | `docs/transfer-guide.md` | 문서 정리 |
| `PROBLEMS_FIXED.md` | `docs/problems-fixed.md` | 문서 정리 |

## 📂 현재 프로젝트 구조

```
golf-ai/
├── 📱 frontend/                    # React Native 모바일 앱
│   ├── App.tsx                    # 메인 앱 진입점
│   ├── screens/                   # 화면 컴포넌트
│   │   ├── HomeScreen.tsx         # 홈 화면
│   │   ├── ProComparisonScreen.tsx # 프로 비교
│   │   ├── AICoachScreen.tsx      # AI 코치
│   │   ├── ChallengesScreen.tsx   # 챌린지
│   │   └── ProfileScreen.tsx      # 프로필
│   ├── config/                    # 설정 파일
│   │   └── api.ts                 # API 설정
│   ├── assets/                    # 이미지/리소스
│   ├── package.json              # Node 의존성
│   └── tsconfig.json             # TypeScript 설정
│
├── 🚀 backend-services/           # 백엔드 서비스
│   └── backend/
│       ├── server.py             # FastAPI 메인 서버
│       ├── init_db.py            # DB 초기화
│       ├── app/                  # 애플리케이션 코드
│       │   ├── api/              # API 라우트
│       │   ├── core/             # 핵심 설정
│       │   ├── models/           # 데이터 모델
│       │   └── services/         # 비즈니스 로직
│       ├── requirements.txt      # Python 의존성
│       └── .env                  # 환경 변수
│
├── 📚 docs/                       # 문서
│   ├── transfer-guide.md         # 마이그레이션 가이드
│   └── problems-fixed.md         # 수정된 문제들
│
├── 🛠️ 스크립트
│   ├── setup.sh                  # 초기 설정 (한 번만)
│   └── run.sh                    # 앱 실행
│
└── 📝 메타 파일
    ├── README.md                 # 프로젝트 설명
    ├── .gitignore               # Git 제외 파일
    └── PROJECT_STRUCTURE.md     # 이 문서

```

## 🏃‍♂️ 빠른 시작

```bash
# 1. 초기 설정 (처음 한 번만)
./setup.sh

# 2. 앱 실행
./run.sh
```

## 🔧 개발자 친화적 특징

### 1. **명확한 이름 규칙**
- `frontend/` - 프론트엔드 코드
- `backend-services/` - 백엔드 서비스
- `docs/` - 모든 문서
- 파일명에 공백 제거

### 2. **표준 스크립트 이름**
- `setup.sh` - 환경 설정
- `run.sh` - 실행
- `test.sh` - 테스트 (추가 예정)
- `deploy.sh` - 배포 (추가 예정)

### 3. **구조화된 문서**
- 모든 문서는 `docs/` 폴더에
- README는 루트에 유지

### 4. **깔끔한 백엔드 구조**
- `server.py` - 메인 진입점
- `app/` - 애플리케이션 로직 분리
- 불필요한 파일 제거

## 📋 체크리스트

### ✅ 완료된 작업
- [x] 폴더명 공백 제거
- [x] 스크립트 파일명 표준화
- [x] 백엔드 파일 정리
- [x] 문서 폴더 구조화
- [x] README 업데이트
- [x] 설정 파일 경로 수정

### 🔜 추가 권장사항
- [ ] TypeScript 절대 경로 설정
- [ ] ESLint/Prettier 설정
- [ ] 테스트 코드 추가
- [ ] CI/CD 파이프라인
- [ ] Docker 설정

## 💡 팁

### 개발 시작하기
```bash
# 프론트엔드 개발
cd frontend && npm run dev

# 백엔드 개발 (hot reload)
cd backend-services/backend
uvicorn server:app --reload --port 8080
```

### Git 작업
```bash
# feature 브랜치
git checkout -b feature/새기능

# 커밋 컨벤션
git commit -m "feat: 프로 비교 기능 추가"
git commit -m "fix: API 연결 오류 수정"
git commit -m "docs: README 업데이트"
```

## 🎉 개선 효과

1. **가독성**: 폴더/파일명이 명확해짐
2. **표준화**: 업계 표준 네이밍 적용
3. **유지보수**: 구조가 직관적으로 변경
4. **협업**: 다른 개발자가 쉽게 이해 가능
5. **확장성**: 새 기능 추가가 용이함

---

**업데이트**: 2025-08-26  
**작성자**: Golf AI Dev Team  
**버전**: 2.0.0 (Refactored)