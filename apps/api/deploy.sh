#!/bin/bash

# 골프 AI 앱 자동 배포 스크립트
# Production, Staging, Development 환경 지원

set -e  # 에러 발생시 스크립트 중단

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 기본 설정
PROJECT_NAME="golf-ai-app"
DOCKER_IMAGE="golf-ai-backend"
DOCKER_TAG="latest"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# 환경 변수 설정
ENVIRONMENT=${1:-development}
VERSION=${2:-$(date +%Y%m%d-%H%M%S)}

# 환경별 설정
case $ENVIRONMENT in
    "production")
        SERVER_PORT=8080
        DOCKER_TAG="prod-$VERSION"
        HEALTH_CHECK_URL="https://api.golfai.app/health"
        DOCKER_REGISTRY="your-registry.com"
        ;;
    "staging")
        SERVER_PORT=8081
        DOCKER_TAG="staging-$VERSION"
        HEALTH_CHECK_URL="https://staging-api.golfai.app/health"
        DOCKER_REGISTRY="your-registry.com"
        ;;
    "development")
        SERVER_PORT=8080
        DOCKER_TAG="dev-$VERSION"
        HEALTH_CHECK_URL="http://localhost:8080/health"
        DOCKER_REGISTRY="localhost"
        ;;
    *)
        log_error "Unknown environment: $ENVIRONMENT"
        log_info "Usage: $0 [production|staging|development] [version]"
        exit 1
        ;;
esac

log_info "🚀 Starting deployment for $ENVIRONMENT environment"
log_info "Version: $VERSION"
log_info "Docker tag: $DOCKER_TAG"

# 필수 디렉토리 생성
mkdir -p $BACKUP_DIR $LOG_DIR

# 함수 정의들

# 사전 검사
pre_deployment_checks() {
    log_info "📋 Running pre-deployment checks..."
    
    # Docker 확인
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Node.js 확인
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # 환경 파일 확인
    ENV_FILE=".env.$ENVIRONMENT"
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Environment file $ENV_FILE not found, using default .env"
        ENV_FILE=".env"
    fi
    
    # 필수 환경 변수 확인
    if [ ! -f "$ENV_FILE" ]; then
        log_error "No environment configuration found"
        exit 1
    fi
    
    log_success "Pre-deployment checks passed"
}

# 의존성 설치 및 빌드
build_application() {
    log_info "🔧 Building application..."
    
    # npm 의존성 설치
    log_info "Installing dependencies..."
    npm ci --production
    
    # Python 의존성 설치
    if [ -f "requirements.txt" ]; then
        log_info "Installing Python dependencies..."
        pip install -r requirements.txt
    fi
    
    # TypeScript 컴파일 (있다면)
    if [ -f "tsconfig.json" ]; then
        log_info "Compiling TypeScript..."
        npx tsc
    fi
    
    # 테스트 실행
    if [ "$ENVIRONMENT" != "development" ]; then
        log_info "Running tests..."
        npm test
    fi
    
    log_success "Application built successfully"
}

# Docker 이미지 빌드
build_docker_image() {
    log_info "🐳 Building Docker image..."
    
    # Dockerfile 확인
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found"
        exit 1
    fi
    
    # Docker 이미지 빌드
    docker build \
        --build-arg NODE_ENV=$ENVIRONMENT \
        --build-arg VERSION=$VERSION \
        -t $DOCKER_IMAGE:$DOCKER_TAG \
        -t $DOCKER_IMAGE:latest \
        .
    
    if [ $? -eq 0 ]; then
        log_success "Docker image built: $DOCKER_IMAGE:$DOCKER_TAG"
    else
        log_error "Docker image build failed"
        exit 1
    fi
}

# 현재 서비스 백업
backup_current_service() {
    log_info "💾 Backing up current service..."
    
    BACKUP_NAME="backup-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p $BACKUP_PATH
    
    # 현재 Docker 이미지 백업
    if docker images $DOCKER_IMAGE:latest &> /dev/null; then
        log_info "Backing up current Docker image..."
        docker tag $DOCKER_IMAGE:latest $DOCKER_IMAGE:backup-$(date +%Y%m%d-%H%M%S)
    fi
    
    # 데이터베이스 백업 (MongoDB)
    if [ ! -z "$MONGODB_URI" ]; then
        log_info "Backing up MongoDB..."
        node backup-recovery.js create
    fi
    
    # 설정 파일 백업
    cp -r . $BACKUP_PATH/ 2>/dev/null || true
    
    log_success "Backup completed: $BACKUP_PATH"
}

# 서비스 배포
deploy_service() {
    log_info "🚀 Deploying service..."
    
    # 기존 컨테이너 중지
    if docker ps -a --format 'table {{.Names}}' | grep -q $PROJECT_NAME; then
        log_info "Stopping existing container..."
        docker stop $PROJECT_NAME 2>/dev/null || true
        docker rm $PROJECT_NAME 2>/dev/null || true
    fi
    
    # 새 컨테이너 실행
    log_info "Starting new container..."
    docker run -d \
        --name $PROJECT_NAME \
        --restart unless-stopped \
        -p $SERVER_PORT:8080 \
        --env-file .env.$ENVIRONMENT \
        -v $(pwd)/uploads:/app/uploads \
        -v $(pwd)/logs:/app/logs \
        -v $(pwd)/backups:/app/backups \
        $DOCKER_IMAGE:$DOCKER_TAG
    
    if [ $? -eq 0 ]; then
        log_success "Container started successfully"
    else
        log_error "Container start failed"
        exit 1
    fi
}

# 헬스 체크
health_check() {
    log_info "🏥 Running health checks..."
    
    # 컨테이너 상태 확인
    if ! docker ps | grep -q $PROJECT_NAME; then
        log_error "Container is not running"
        return 1
    fi
    
    # 헬스 체크 엔드포인트 호출
    log_info "Checking health endpoint..."
    
    for i in {1..30}; do
        if curl -f -s $HEALTH_CHECK_URL > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        log_info "Health check attempt $i/30..."
        sleep 2
    done
    
    log_error "Health check failed"
    return 1
}

# 성능 테스트
performance_test() {
    if [ "$ENVIRONMENT" = "development" ]; then
        log_info "Skipping performance test in development environment"
        return 0
    fi
    
    log_info "🏃 Running performance tests..."
    
    # 간단한 부하 테스트
    if command -v node &> /dev/null; then
        timeout 60 node load-test.js || log_warning "Performance test completed with warnings"
    fi
    
    log_success "Performance test completed"
}

# 롤백 함수
rollback() {
    log_error "🔄 Rolling back deployment..."
    
    # 최신 백업 찾기
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/ | head -n1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    log_info "Rolling back to: $LATEST_BACKUP"
    
    # 현재 컨테이너 중지
    docker stop $PROJECT_NAME 2>/dev/null || true
    docker rm $PROJECT_NAME 2>/dev/null || true
    
    # 백업 이미지로 복원
    BACKUP_IMAGE=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep backup | head -n1)
    if [ ! -z "$BACKUP_IMAGE" ]; then
        docker tag $BACKUP_IMAGE $DOCKER_IMAGE:latest
        deploy_service
    fi
    
    log_success "Rollback completed"
}

# 배포 후 정리
post_deployment_cleanup() {
    log_info "🧹 Running post-deployment cleanup..."
    
    # 오래된 Docker 이미지 정리
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    
    # 오래된 백업 정리 (30일 이상)
    log_info "Cleaning up old backups..."
    find $BACKUP_DIR -type d -name "backup-*" -mtime +30 -exec rm -rf {} \; 2>/dev/null || true
    
    # 로그 파일 정리
    find $LOG_DIR -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# 배포 알림
send_notification() {
    local status=$1
    local message=$2
    
    log_info "📧 Sending deployment notification..."
    
    # Slack 알림 (Webhook URL이 설정된 경우)
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Golf AI Deployment - $ENVIRONMENT\\nStatus: $status\\n$message\"}" \
            $SLACK_WEBHOOK_URL 2>/dev/null || true
    fi
    
    # Discord 알림 (Webhook URL이 설정된 경우)
    if [ ! -z "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"🚀 Golf AI Deployment - $ENVIRONMENT\\nStatus: $status\\n$message\"}" \
            $DISCORD_WEBHOOK_URL 2>/dev/null || true
    fi
    
    log_info "Notification sent"
}

# 메인 배포 프로세스
main_deployment() {
    local start_time=$(date +%s)
    
    # 트랩 설정 (에러 발생시 롤백)
    trap 'log_error "Deployment failed, initiating rollback..."; rollback; exit 1' ERR
    
    # 배포 단계들
    pre_deployment_checks
    build_application
    build_docker_image
    backup_current_service
    deploy_service
    
    # 헬스 체크
    if ! health_check; then
        log_error "Health check failed, rolling back..."
        rollback
        send_notification "FAILED" "Health check failed"
        exit 1
    fi
    
    # 성능 테스트
    performance_test
    
    # 정리
    post_deployment_cleanup
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Deployment took $duration seconds"
    log_info "Service URL: $HEALTH_CHECK_URL"
    log_info "Version: $VERSION"
    
    # 성공 알림
    send_notification "SUCCESS" "Deployment completed in ${duration}s\\nVersion: $VERSION\\nURL: $HEALTH_CHECK_URL"
}

# 도움말
show_help() {
    echo "Golf AI App Deployment Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [VERSION]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  production   - Production deployment"
    echo "  staging      - Staging deployment"
    echo "  development  - Development deployment (default)"
    echo ""
    echo "VERSION:"
    echo "  Custom version tag (default: current timestamp)"
    echo ""
    echo "Examples:"
    echo "  $0 production v1.2.3"
    echo "  $0 staging"
    echo "  $0"
    echo ""
    echo "Special commands:"
    echo "  $0 rollback [ENVIRONMENT]  - Rollback to previous version"
    echo "  $0 status [ENVIRONMENT]    - Check deployment status"
    echo "  $0 logs [ENVIRONMENT]      - Show container logs"
    echo ""
}

# 상태 확인
check_status() {
    log_info "📊 Checking deployment status for $ENVIRONMENT..."
    
    # 컨테이너 상태
    if docker ps | grep -q $PROJECT_NAME; then
        log_success "Container is running"
        docker ps | grep $PROJECT_NAME
    else
        log_warning "Container is not running"
    fi
    
    # 헬스 체크
    if curl -f -s $HEALTH_CHECK_URL > /dev/null; then
        log_success "Health check: OK"
    else
        log_warning "Health check: FAILED"
    fi
    
    # 리소스 사용량
    if docker stats --no-stream $PROJECT_NAME 2>/dev/null; then
        echo ""
    fi
}

# 로그 확인
show_logs() {
    log_info "📜 Showing logs for $ENVIRONMENT..."
    docker logs --tail 100 -f $PROJECT_NAME
}

# 명령어 파싱
case $1 in
    "help"|"-h"|"--help")
        show_help
        exit 0
        ;;
    "rollback")
        ENVIRONMENT=${2:-development}
        rollback
        exit 0
        ;;
    "status")
        ENVIRONMENT=${2:-development}
        check_status
        exit 0
        ;;
    "logs")
        ENVIRONMENT=${2:-development}
        show_logs
        exit 0
        ;;
    "")
        # 기본 실행
        main_deployment
        ;;
    *)
        # 환경 지정하고 실행
        main_deployment
        ;;
esac