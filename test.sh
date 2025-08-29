#!/bin/bash

echo "🧪 Golf AI App 테스트 스크립트"
echo "================================"

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}[1/4] 시스템 파일 제한 증가...${NC}"
# macOS 파일 디스크립터 제한 증가
sudo launchctl limit maxfiles 65536 65536 2>/dev/null || {
    echo -e "${YELLOW}관리자 권한이 필요합니다${NC}"
    ulimit -n 10240
}

echo -e "${BLUE}[2/4] 백엔드 서버 테스트...${NC}"
cd backend-services/backend

# 백엔드 실행 확인
if lsof -ti:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 백엔드 서버 실행 중${NC}"
else
    echo -e "${YELLOW}백엔드 서버 시작 중...${NC}"
    source venv/bin/activate
    python3 server.py &
    BACKEND_PID=$!
    sleep 3
fi

# API 테스트
echo -e "${BLUE}[3/4] API 엔드포인트 테스트...${NC}"

# Health check
if curl -s http://localhost:8080/api/v1/health | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health Check: 정상${NC}"
else
    echo -e "${RED}✗ Health Check: 실패${NC}"
fi

# User stats
if curl -s http://localhost:8080/api/v1/users/stats | grep -q "success"; then
    echo -e "${GREEN}✓ User Stats API: 정상${NC}"
else
    echo -e "${RED}✗ User Stats API: 실패${NC}"
fi

# Challenges
if curl -s http://localhost:8080/api/v1/golf/challenges | grep -q "challenges"; then
    echo -e "${GREEN}✓ Challenges API: 정상${NC}"
else
    echo -e "${RED}✗ Challenges API: 실패${NC}"
fi

echo -e "${BLUE}[4/4] 프론트엔드 시작...${NC}"
cd ../../frontend

# 캐시 정리
rm -rf node_modules/.cache .expo

# Expo 실행 (웹 버전으로 테스트)
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}🎉 테스트 완료!${NC}"
echo ""
echo "📱 앱 실행 방법:"
echo "  1. 새 터미널 열기"
echo "  2. cd frontend"
echo "  3. npx expo start --web"
echo ""
echo "🌐 웹 브라우저에서 확인:"
echo "  http://localhost:19006"
echo ""
echo "📱 모바일 테스트:"
echo "  1. Expo Go 앱 설치"
echo "  2. npx expo start"
echo "  3. QR 코드 스캔"
echo ""
echo -e "${YELLOW}팁: 파일 감시 오류 발생 시${NC}"
echo "  sudo launchctl limit maxfiles 65536 65536"
echo "  ulimit -n 10240"