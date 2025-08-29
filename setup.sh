#!/bin/bash

# Golf AI App 초기화 스크립트

echo "🏌️ Golf AI App 초기화 중..."
echo "================================"

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend-services/backend"

echo -e "${BLUE}[1/4] 백엔드 설정...${NC}"
cd "$BACKEND_DIR"

# Python 가상환경 확인 및 생성
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Python 가상환경 생성 중...${NC}"
    python3 -m venv venv
fi

# 가상환경 활성화 및 의존성 설치
source venv/bin/activate
echo -e "${YELLOW}백엔드 의존성 설치 중...${NC}"
pip install -r requirements_minimal.txt 2>/dev/null || {
    echo -e "${RED}의존성 설치 실패${NC}"
}

# 데이터베이스 초기화
if [ ! -f "golf_ai.db" ]; then
    echo -e "${YELLOW}데이터베이스 초기화 중...${NC}"
    python3 init_db.py
fi

echo -e "${GREEN}✓ 백엔드 설정 완료${NC}"

echo -e "${BLUE}[2/4] 프론트엔드 설정...${NC}"
cd "$FRONTEND_DIR"

# node_modules 확인 및 설치
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}프론트엔드 의존성 설치 중...${NC}"
    npm install
fi

echo -e "${GREEN}✓ 프론트엔드 설정 완료${NC}"

echo -e "${BLUE}[3/4] 환경 확인...${NC}"

# 포트 확인
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  포트 $port 가 이미 사용 중입니다${NC}"
        return 1
    else
        echo -e "${GREEN}✓ 포트 $port 사용 가능${NC}"
        return 0
    fi
}

check_port 8080
check_port 8081

echo -e "${BLUE}[4/4] IP 주소 확인...${NC}"
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo -e "${GREEN}✓ 현재 IP 주소: $IP_ADDRESS${NC}"

# API 설정 파일 업데이트
API_CONFIG="$FRONTEND_DIR/config/api.ts"
if [ -f "$API_CONFIG" ]; then
    # IP 주소 업데이트
    sed -i.bak "s/const DEV_IP = '.*'/const DEV_IP = '$IP_ADDRESS'/" "$API_CONFIG"
    echo -e "${GREEN}✓ API 설정 업데이트 완료${NC}"
fi

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}🎉 Golf AI App 초기화 완료!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "실행 방법:"
echo "  ./start.sh"
echo ""
echo "접속 정보:"
echo "  📱 모바일 앱: Expo Go에서 QR 코드 스캔"
echo "  🌐 API 문서: http://localhost:8080/docs"
echo "  💻 개발자 도구: http://localhost:19002"
echo ""
echo "네트워크 설정:"
echo "  IP 주소: $IP_ADDRESS"
echo "  백엔드 포트: 8080"
echo "  프론트엔드 포트: 8081"