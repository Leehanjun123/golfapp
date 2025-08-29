# 🏌️ Golf AI Coach - APK Release v1.0.0

## 📱 다운로드

**APK 파일**: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (110MB)
> GitHub 파일 크기 제한으로 인해 APK는 로컬 빌드 디렉토리에 위치합니다.

## 🚀 설치 방법

### Android 설치
1. **설정** → **보안** → **알 수 없는 출처** 허용
2. APK 파일 다운로드
3. 파일 관리자에서 APK 실행
4. 설치 완료

### 또는 ADB 사용
```bash
adb install golf-ai-coach-v1.0.0.apk
```

## ✨ 주요 기능

- **🤖 AI 스윙 분석**: 94% 정확도의 MediaPipe 기반 골프 스윙 분석
- **📹 실시간 피드백**: 동영상 녹화 및 즉시 분석 결과 제공
- **📊 상세 리포트**: 스윙 각도, X-Factor, 어깨 회전 등 상세 데이터
- **🎯 개인 맞춤 훈련**: AI 기반 개인별 훈련 프로그램 제공
- **📱 네이티브 성능**: React Native + Expo로 최적화된 모바일 경험

## 🔧 시스템 요구사항

- **Android**: 7.0 (API 24) 이상
- **RAM**: 최소 3GB 권장
- **저장공간**: 200MB 이상
- **카메라**: 후면 카메라 필수
- **네트워크**: 인터넷 연결 필요 (API 통신용)

## 🌐 백엔드 설정

앱 사용을 위해서는 백엔드 서버가 실행되어야 합니다:

```bash
cd apps/api
npm start
```

백엔드 서버: `http://localhost:8080`
외부 접속: `https://golfai.loca.lt` (localtunnel 사용)

## 📋 릴리스 정보

- **버전**: 1.0.0
- **빌드 날짜**: 2025-08-30
- **빌드 도구**: Gradle 8.13, Java 17
- **타겟 SDK**: Android 35
- **최소 SDK**: Android 24

## 🔄 업데이트

- **OTA 업데이트**: JavaScript 코드는 자동 업데이트
- **APK 업데이트**: 새 버전 수동 설치 필요

## 🐛 알려진 이슈

- 첫 실행 시 로딩 시간이 길 수 있음
- 카메라 권한 필요 (최초 실행 시 요청)
- 네트워크 연결 필수 (오프라인 모드 미지원)

## 📞 지원

- **GitHub**: https://github.com/Leehanjun123/golfapp
- **이슈 리포트**: GitHub Issues 탭 사용
- **백엔드 서버**: 로컬에서 직접 실행 필요

---

**🏌️‍♂️ 골프 실력 향상을 위한 AI 코치가 함께합니다!**