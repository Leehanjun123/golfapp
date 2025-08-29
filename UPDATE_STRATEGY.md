# 📱 Golf AI Coach 업데이트 전략

## 🔄 업데이트 방법별 비교

### 1. OTA 업데이트 (Over-The-Air)
**사용 시기:**
- UI/UX 개선
- 버그 수정
- API 연결 변경
- JavaScript 코드 수정

**장점:**
- ✅ 사용자가 재설치 불필요
- ✅ 즉시 배포 가능
- ✅ 앱스토어 승인 불필요

**명령어:**
```bash
# 업데이트 배포
eas update --branch production --message "스윙 분석 정확도 개선"

# 특정 그룹만 업데이트
eas update --branch beta --message "베타 테스터용 업데이트"
```

### 2. 새 APK 배포
**사용 시기:**
- 새로운 권한 추가
- 네이티브 플러그인 변경
- 앱 아이콘/이름 변경
- 메이저 버전 업그레이드

**과정:**
1. `app.json`에서 버전 업데이트
2. 새 APK 빌드
3. 사용자에게 새 링크 전달

## 🎯 실제 운영 권장사항

### A. 개발/테스트 단계 (현재)
```bash
# 빠른 테스트용 업데이트
eas update --branch preview

# 베타 테스터 그룹
eas update --branch beta
```

### B. 실제 서비스 단계
```bash
# 프로덕션 업데이트
eas update --branch production

# 단계별 롤아웃
eas update --branch production --message "iOS 우선 배포"
```

### C. 업데이트 알림 구현
```javascript
// 앱 내 업데이트 체크
import * as Updates from 'expo-updates';

async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // 사용자에게 재시작 권유
      Alert.alert(
        '업데이트 완료', 
        '새로운 기능이 추가되었습니다. 앱을 재시작하시겠습니까?',
        [
          { text: '나중에', style: 'cancel' },
          { text: '재시작', onPress: () => Updates.reloadAsync() }
        ]
      );
    }
  } catch (error) {
    console.log('업데이트 체크 실패:', error);
  }
}
```

## 📊 업데이트 전략 매트릭스

| 변경 유형 | 방법 | 시간 | 사용자 행동 |
|-----------|------|------|-------------|
| 🐛 버그 수정 | OTA | 즉시 | 앱 재시작만 |
| ✨ 새 기능 | OTA | 즉시 | 앱 재시작만 |
| 🔧 API 변경 | OTA | 즉시 | 앱 재시작만 |
| 📷 권한 추가 | 새 APK | 5-10분 | 재설치 필요 |
| 🎨 아이콘 변경 | 새 APK | 5-10분 | 재설치 필요 |

## 🚀 배포 워크플로우

### 1. 일반 업데이트 (주간)
```bash
# 1. 코드 수정 후
git add .
git commit -m "feat: 스윙 분석 개선"

# 2. OTA 배포
eas update --branch production --message "스윙 분석 정확도 5% 향상"

# 3. 사용자는 다음 앱 실행시 자동 업데이트
```

### 2. 메이저 업데이트 (월간)
```bash
# 1. 버전 업데이트
# app.json: "version": "1.1.0", "versionCode": 2

# 2. 새 APK 빌드
eas build --platform android --profile production

# 3. 사용자에게 새 링크 배포
```

## 💡 Pro Tips

### 🎯 효율적인 업데이트
- **소규모 변경**: OTA 사용 (즉시 배포)
- **대규모 변경**: 새 APK (안정성 확보)
- **긴급 수정**: OTA로 즉시 핫픽스

### 📱 사용자 경험 개선
```javascript
// 앱 시작시 업데이트 체크
useEffect(() => {
  checkForUpdates();
}, []);

// 백그라운드에서 자동 다운로드
Updates.addListener(Updates.UpdateEvent.UPDATE_AVAILABLE, () => {
  // 자동으로 백그라운드 다운로드
});
```

### 🔄 롤백 전략
```bash
# 문제 발생시 이전 버전으로 롤백
eas update --branch production --message "긴급 롤백"
```

## 현재 앱 업데이트 설정
- ✅ OTA 업데이트 활성화
- ✅ 앱 시작시 자동 체크
- ✅ 30초 타임아웃 설정
- 🔧 필요시: 사용자 알림 기능 추가

## 다음 단계
1. **첫 APK 배포** (현재 진행중)
2. **OTA 업데이트 테스트**
3. **사용자 알림 기능 구현**
4. **자동 배포 파이프라인 구축**