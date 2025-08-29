# 🏌️ Golf AI App - Production Deployment Guide

## 📋 개요

이 문서는 Golf AI 앱을 프로덕션 환경에 배포하기 위한 종합 가이드입니다.

## 🛠 시스템 요구사항

### 최소 하드웨어 요구사항
- **CPU**: 4코어 (8코어 권장)
- **RAM**: 8GB (16GB 권장)
- **Storage**: 50GB SSD (100GB 권장)
- **Network**: 1Gbps 대역폭

### 소프트웨어 요구사항
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (컨테이너에서 실행)
- **Python**: 3.9+ (컨테이너에서 실행)

## 🚀 배포 프로세스

### 1. 사전 준비

#### 1.1 서버 설정
```bash
# Docker 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 1.2 방화벽 설정
```bash
# 필수 포트 열기
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 8080  # API 서버
sudo ufw enable
```

#### 1.3 SSL 인증서 설정 (Let's Encrypt)
```bash
# Certbot 설치
sudo apt-get update
sudo apt-get install certbot

# 인증서 발급
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com
```

### 2. 애플리케이션 배포

#### 2.1 소스 코드 다운로드
```bash
git clone https://github.com/your-username/golf-ai-app.git
cd golf-ai-app/backend
```

#### 2.2 환경 설정
```bash
# 프로덕션 환경 변수 설정
cp .env.production .env
nano .env

# 반드시 변경해야 할 값들:
# - JWT_SECRET
# - SESSION_SECRET 
# - ENCRYPTION_KEY
# - MONGO_PASSWORD
# - BACKUP_ENCRYPTION_KEY
```

#### 2.3 배포 실행
```bash
# 자동 배포 스크립트 실행
./deploy.sh production

# 또는 Docker Compose 사용
docker-compose --profile production up -d
```

### 3. 배포 확인

#### 3.1 서비스 상태 확인
```bash
# 컨테이너 상태 확인
docker ps

# 헬스 체크
curl -f http://localhost:8080/health

# 로그 확인
docker logs golf-ai-backend
```

#### 3.2 성능 테스트
```bash
# 부하 테스트 실행
node load-test.js

# 안정성 테스트 (백그라운드)
nohup node stability-test.js > stability.log 2>&1 &
```

## 🔧 시스템 구성

### 서비스 아키텍처
```
[Internet] -> [Nginx] -> [Golf AI App] -> [MongoDB/Redis]
                     -> [Monitoring]
                     -> [A/B Testing]
                     -> [Feedback]
```

### 포트 구성
- **80/443**: Nginx (웹 서버)
- **8080**: Golf AI API 서버
- **3001**: 모니터링 대시보드
- **3002**: A/B 테스팅 시스템
- **3003**: 사용자 피드백 시스템
- **27017**: MongoDB (내부)
- **6379**: Redis (내부)

## 📊 모니터링 시스템

### 1. 실시간 모니터링 대시보드
```
URL: https://yourdomain.com/monitoring
기능: 서버 상태, 성능 메트릭, 실시간 알림
```

### 2. 성능 프로파일링
```bash
# 성능 분석 실행
node performance-profiler.js

# 결과 확인
ls performance-report-*.json
```

### 3. 로그 모니터링
```bash
# 실시간 로그 확인
tail -f logs/app.log

# 에러 로그 검색
grep "ERROR" logs/app.log
```

## 🔐 보안 설정

### 1. 방화벽 설정
```bash
# UFW 규칙 확인
sudo ufw status

# 특정 IP만 SSH 허용 (권장)
sudo ufw allow from YOUR_IP_ADDRESS to any port 22
```

### 2. SSL/TLS 설정
- Let's Encrypt 인증서 자동 갱신
- HTTPS 강제 리다이렉트
- HSTS (HTTP Strict Transport Security) 활성화

### 3. 보안 스캔
```bash
# 보안 취약점 스캔
node security-audit.js

# 결과 확인
cat security-audit-report-*.json
```

## 💾 백업 및 복구

### 1. 자동 백업 설정
```bash
# 매일 새벽 2시 자동 백업
echo "0 2 * * * /path/to/golf-ai-app/backup-recovery.js create" | crontab -
```

### 2. 백업 확인
```bash
# 백업 목록 확인
node backup-recovery.js list

# 백업 통계
node backup-recovery.js stats
```

### 3. 복구 프로세스
```bash
# 백업 목록에서 복구할 백업 선택
node backup-recovery.js list

# 복구 실행
node backup-recovery.js restore /path/to/backup-metadata.json
```

## 📈 성능 최적화

### 1. 데이터베이스 최적화
- MongoDB 인덱스 설정
- 연결 풀 최적화
- 쿼리 성능 모니터링

### 2. 캐싱 전략
- Redis 캐싱 활용
- API 응답 캐싱
- 이미지 CDN 활용

### 3. 리소스 최적화
- Docker 이미지 경량화
- 메모리 사용량 최적화
- CPU 사용량 모니터링

## 🧪 A/B 테스팅 & 피드백

### 1. A/B 테스트 설정
```
URL: https://yourdomain.com/ab-testing/dashboard
기능: 실험 관리, 결과 분석, 통계적 유의성 검정
```

### 2. 사용자 피드백 시스템
```
URL: https://yourdomain.com/feedback/dashboard
기능: 피드백 수집, 감정 분석, 키워드 추출
```

## 🚨 장애 대응

### 1. 일반적인 문제 해결

#### API 서버 응답 없음
```bash
# 컨테이너 상태 확인
docker ps -a

# 컨테이너 재시작
docker restart golf-ai-backend

# 로그 확인
docker logs golf-ai-backend --tail 100
```

#### 메모리 부족
```bash
# 메모리 사용량 확인
docker stats

# 프로세스별 메모리 사용량
docker exec golf-ai-backend ps aux
```

#### 디스크 용량 부족
```bash
# 디스크 사용량 확인
df -h

# Docker 정리
docker system prune -a

# 오래된 백업 정리
node backup-recovery.js cleanup
```

### 2. 긴급 롤백
```bash
# 이전 버전으로 롤백
./deploy.sh rollback production

# 수동 롤백
docker stop golf-ai-backend
docker run -d --name golf-ai-backend-rollback [PREVIOUS_IMAGE]
```

## 📊 성능 벤치마크

### 예상 성능 지표
- **동시 사용자**: 1,000+ (부하 테스트 검증됨)
- **응답 시간**: < 200ms (평균)
- **AI 분석 시간**: < 3초
- **가용성**: 99.9% 목표

### 성능 테스트 결과
```bash
# 성능 테스트 실행
node load-test.js

# 24시간 안정성 테스트
node stability-test.js
```

## 🔄 CI/CD 파이프라인

### GitHub Actions 설정 (예시)
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        run: |
          ssh user@server './deploy.sh production'
```

## 📞 지원 및 연락처

### 긴급 상황 대응
- **Slack 알림**: 자동 장애 알림 설정됨
- **Discord 알림**: 배포 상태 알림
- **로그 모니터링**: 실시간 에러 추적

### 정기 점검 일정
- **일일**: 자동 백업 확인
- **주간**: 성능 리포트 검토
- **월간**: 보안 스캔 및 업데이트

---

## 📝 체크리스트

### 배포 전 확인사항
- [ ] 환경 변수 설정 완료
- [ ] SSL 인증서 발급
- [ ] 방화벽 설정
- [ ] 백업 시스템 동작 확인
- [ ] 모니터링 설정

### 배포 후 확인사항
- [ ] 헬스 체크 통과
- [ ] 성능 테스트 실행
- [ ] 모니터링 대시보드 정상 작동
- [ ] 백업 자동 실행 확인
- [ ] 알림 시스템 테스트

---

**🎯 이제 Golf AI 앱이 프로덕션 환경에서 안정적으로 운영될 준비가 완료되었습니다!**