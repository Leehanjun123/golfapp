# 🏌️ Golf AI Coach 배포 가이드

## 현재 설정 상태
- ✅ 백엔드: https://icy-cycles-wash.loca.lt (localtunnel로 외부 접속 가능)
- ✅ 프론트엔드: 웹 버전 실행 중 (http://localhost:8082)
- ✅ AI 분석: 94% 정확도로 작동 중

## 📱 외부에서 앱 사용하는 3가지 방법

### 방법 1: 웹 앱으로 바로 사용 (가장 간단!)
1. 핸드폰 브라우저에서 접속: http://192.168.45.217:8082
2. 홈 화면에 추가하여 앱처럼 사용
   - Android: Chrome 메뉴 → "홈 화면에 추가"
   - iOS: Safari 공유 버튼 → "홈 화면에 추가"

### 방법 2: Expo 계정으로 APK 빌드
1. https://expo.dev 에서 무료 계정 생성
2. 터미널에서 로그인: `npx expo login`
3. APK 빌드: `eas build --platform android --profile preview`
4. 빌드 완료 후 다운로드 링크 제공됨

### 방법 3: 온라인 APK 변환 서비스
1. https://www.pwabuilder.com/ 접속
2. URL 입력: http://192.168.45.217:8082
3. APK 생성 및 다운로드

## 🚀 백엔드 유지 방법

### 현재 실행 중인 서비스:
- Backend API: http://localhost:8080
- Localtunnel: https://icy-cycles-wash.loca.lt
- Frontend Web: http://localhost:8082

### 백엔드 재시작 명령어:
```bash
# 백엔드 서버 시작
cd /Users/leehanjun/Desktop/golfapp/apps/api
npm start

# 별도 터미널에서 localtunnel 실행
npx localtunnel --port 8080
# 새로운 URL이 생성되면 앱 설정 업데이트 필요
```

### 프론트엔드 재시작 명령어:
```bash
cd /Users/leehanjun/Desktop/golfapp/apps/mobile
npx expo start --web --port 8082
```

## 📦 배포용 APK 만들기 (Expo 계정 필요)

1. Expo 계정이 없다면:
   - https://expo.dev/signup 에서 가입
   - 이메일과 비밀번호만 있으면 무료

2. 로그인:
   ```bash
   npx expo login
   # 이메일과 비밀번호 입력
   ```

3. 프로젝트 초기화:
   ```bash
   eas init
   # 프로젝트 이름 입력
   ```

4. APK 빌드:
   ```bash
   eas build --platform android --profile preview
   # 빌드는 클라우드에서 진행 (5-10분 소요)
   ```

5. 다운로드:
   - 빌드 완료 후 제공되는 링크에서 APK 다운로드
   - 이 링크를 다른 사람과 공유 가능

## 🔧 문제 해결

### Localtunnel URL이 변경되었을 때:
1. `/apps/mobile/config/env.ts` 파일 열기
2. `API_URL` 을 새 URL로 변경
3. 앱 재시작

### 메모리 부족 경고:
```bash
# 불필요한 프로세스 종료
pkill -f node
# 백엔드만 다시 시작
cd /apps/api && npm start
```

## 📞 지원
- 백엔드 서버는 항상 로컬에서 실행되어야 함
- Localtunnel은 무료이지만 URL이 재시작할 때마다 변경됨
- 영구 URL이 필요하면 ngrok 유료 버전 고려