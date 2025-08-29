#!/bin/bash

echo "🧪 Golf AI App - 전체 테스트 실행"
echo "================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend 테스트
echo ""
echo "📦 Backend 테스트 실행중..."
cd backend-services/backend
source venv/bin/activate
python3 -m pytest test_api.py -v
BACKEND_RESULT=$?

if [ $BACKEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Backend 테스트 성공${NC}"
else
    echo -e "${RED}❌ Backend 테스트 실패${NC}"
fi

# Frontend 린트 체크
echo ""
echo "🎨 Frontend 코드 품질 체크..."
cd ../../frontend
npm run lint
LINT_RESULT=$?

if [ $LINT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ 코드 품질 체크 통과${NC}"
else
    echo -e "${YELLOW}⚠️  코드 품질 개선 필요${NC}"
fi

# TypeScript 타입 체크
echo ""
echo "📝 TypeScript 타입 체크..."
npm run typecheck
TYPE_RESULT=$?

if [ $TYPE_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ 타입 체크 통과${NC}"
else
    echo -e "${RED}❌ 타입 오류 발견${NC}"
fi

# 결과 요약
echo ""
echo "================================="
echo "📊 테스트 결과 요약:"

if [ $BACKEND_RESULT -eq 0 ] && [ $LINT_RESULT -eq 0 ] && [ $TYPE_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 테스트 통과!${NC}"
    exit 0
else
    echo -e "${RED}❌ 일부 테스트 실패${NC}"
    [ $BACKEND_RESULT -ne 0 ] && echo "  - Backend 테스트 실패"
    [ $LINT_RESULT -ne 0 ] && echo "  - 코드 품질 체크 실패"
    [ $TYPE_RESULT -ne 0 ] && echo "  - TypeScript 타입 체크 실패"
    exit 1
fi