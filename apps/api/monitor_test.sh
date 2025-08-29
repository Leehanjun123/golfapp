#!/bin/bash

# 골프 AI 테스트 모니터링 스크립트

echo "🔍 골프 AI 실시간 모니터링 시작"
echo "================================"
echo "서버: http://192.168.45.217:8080"
echo "================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 모니터링 함수
monitor_logs() {
    echo -e "\n📊 실시간 로그 모니터링"
    echo "------------------------"
    
    # 최근 로그 파일 찾기
    LOG_FILE=$(ls -t logs/info-*.log 2>/dev/null | head -1)
    ERROR_FILE=$(ls -t logs/error-*.log 2>/dev/null | head -1)
    
    if [ -f "$LOG_FILE" ]; then
        echo "📝 로그 파일: $LOG_FILE"
        
        # 실시간 로그 모니터링 (색상 적용)
        tail -f "$LOG_FILE" | while read line; do
            if echo "$line" | grep -q "ERROR"; then
                echo -e "${RED}❌ $line${NC}"
            elif echo "$line" | grep -q "성공\|완료\|POST.*200"; then
                echo -e "${GREEN}✅ $line${NC}"
            elif echo "$line" | grep -q "WARNING\|느린 요청"; then
                echo -e "${YELLOW}⚠️  $line${NC}"
            elif echo "$line" | grep -q "분석 시작\|하이브리드 AI"; then
                echo -e "🤖 $line"
            else
                echo "$line"
            fi
        done
    else
        echo "❌ 로그 파일을 찾을 수 없습니다"
    fi
}

# 성능 통계 함수
show_stats() {
    echo -e "\n📈 성능 통계 (최근 10개 요청)"
    echo "------------------------"
    
    if [ -f "logs/info-$(date +%Y-%m-%d).log" ]; then
        # 응답 시간 추출
        grep "API_POST_analyze" logs/info-$(date +%Y-%m-%d).log | tail -10 | while read line; do
            if echo "$line" | grep -q "ms"; then
                TIME=$(echo "$line" | grep -oE '[0-9]+ms' | grep -oE '[0-9]+')
                if [ "$TIME" -lt 500 ]; then
                    echo -e "${GREEN}✅ 응답: ${TIME}ms${NC}"
                elif [ "$TIME" -lt 1000 ]; then
                    echo -e "${YELLOW}⚠️  응답: ${TIME}ms${NC}"
                else
                    echo -e "${RED}❌ 응답: ${TIME}ms${NC}"
                fi
            fi
        done
        
        # 평균 계산
        AVG=$(grep "API_POST_analyze" logs/info-$(date +%Y-%m-%d).log | tail -10 | grep -oE '[0-9]+ms' | grep -oE '[0-9]+' | awk '{sum+=$1} END {if(NR>0) print sum/NR}')
        
        if [ ! -z "$AVG" ]; then
            echo "------------------------"
            echo -e "평균 응답시간: ${YELLOW}${AVG}ms${NC}"
        fi
    fi
}

# 헬스체크 함수
health_check() {
    echo -e "\n💚 서버 헬스체크"
    echo "------------------------"
    
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.45.217:8080/health)
    
    if [ "$RESPONSE" = "200" ]; then
        echo -e "${GREEN}✅ 서버 정상 작동 중${NC}"
    else
        echo -e "${RED}❌ 서버 응답 없음 (코드: $RESPONSE)${NC}"
    fi
    
    # AI 상태 체크
    AI_STATUS=$(curl -s http://192.168.45.217:8080/api/v1/ai/status 2>/dev/null)
    if [ ! -z "$AI_STATUS" ]; then
        echo -e "${GREEN}✅ AI 모델 준비됨${NC}"
        echo "$AI_STATUS" | jq '.' 2>/dev/null || echo "$AI_STATUS"
    fi
}

# 메뉴 선택
while true; do
    echo -e "\n🎯 모니터링 옵션"
    echo "------------------------"
    echo "1) 실시간 로그 모니터링"
    echo "2) 성능 통계 보기"
    echo "3) 서버 헬스체크"
    echo "4) 전체 모니터링 (자동)"
    echo "5) 종료"
    echo -n "선택: "
    
    read choice
    
    case $choice in
        1)
            monitor_logs
            ;;
        2)
            show_stats
            ;;
        3)
            health_check
            ;;
        4)
            echo "🔄 자동 모니터링 시작 (Ctrl+C로 중지)"
            while true; do
                clear
                echo "🏌️ 골프 AI 모니터링 대시보드"
                echo "================================"
                echo "시간: $(date '+%Y-%m-%d %H:%M:%S')"
                health_check
                show_stats
                sleep 5
            done
            ;;
        5)
            echo "👋 모니터링 종료"
            exit 0
            ;;
        *)
            echo "❌ 잘못된 선택"
            ;;
    esac
done