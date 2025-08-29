#!/bin/bash

# Golf AI App 시작 스크립트

echo "🏌️ Golf AI App 시작 중..."
echo "================================"

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 백엔드 서버 시작
echo -e "${BLUE}[1/2] FastAPI 백엔드 서버 시작...${NC}"
cd "backend-services/backend"
source venv/bin/activate 2>/dev/null || {
    echo -e "${YELLOW}가상환경 생성 중...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements_minimal.txt
    pip install email-validator aiofiles
}

# 백엔드를 백그라운드에서 실행 (포트 8080)
source venv/bin/activate && python3 server.py 8080 &
BACKEND_PID=$!
echo -e "${GREEN}✓ 백엔드 서버 실행 중 (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}  API 문서: http://localhost:8080/docs${NC}"

# 프론트엔드 앱 시작
cd "../../frontend"
echo -e "${BLUE}[2/2] Expo 개발 서버 시작...${NC}"

# node_modules 확인
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}의존성 설치 중...${NC}"
    npm install
fi

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}🎉 Golf AI App이 실행되었습니다!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "📱 모바일 앱 접속:"
echo "  1. Expo Go 앱 설치"
echo "  2. QR 코드 스캔"
echo ""
echo "🔗 유용한 링크:"
echo "  - API 문서: http://localhost:8080/docs"
echo "  - Expo 개발자 도구: http://localhost:19002"
echo ""
echo "종료하려면 Ctrl+C를 누르세요"
echo ""

# Expo 시작
npx expo start

# 종료 시 백엔드도 종료
trap "kill $BACKEND_PID 2>/dev/null" EXIT