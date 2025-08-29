# 골프 AI 앱 Docker 이미지

# Node.js 18 Alpine 베이스 이미지 (경량화)
FROM node:18-alpine

# 빌드 인자
ARG NODE_ENV=production
ARG VERSION=latest

# 환경 변수 설정
ENV NODE_ENV=$NODE_ENV
ENV APP_VERSION=$VERSION
ENV PORT=8080

# 시스템 패키지 업데이트 및 Python 설치
RUN apk update && apk add --no-cache \
    python3 \
    py3-pip \
    python3-dev \
    build-base \
    linux-headers \
    pcre-dev \
    musl-dev \
    libffi-dev \
    bash \
    curl \
    && ln -sf python3 /usr/bin/python \
    && ln -sf pip3 /usr/bin/pip

# 작업 디렉토리 설정
WORKDIR /app

# Python 의존성 먼저 설치 (캐싱 최적화)
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# Node.js 의존성 파일 복사
COPY package*.json ./

# Node.js 의존성 설치
RUN npm ci --only=production && npm cache clean --force

# 애플리케이션 소스 복사
COPY . .

# 불필요한 파일 제거
RUN rm -rf \
    tests/ \
    test/ \
    *.test.js \
    *.spec.js \
    .git/ \
    .gitignore \
    README.md \
    docs/ \
    .env.example \
    node_modules/.cache/

# 애플리케이션 디렉토리 생성
RUN mkdir -p \
    /app/uploads \
    /app/logs \
    /app/backups \
    /app/temp

# 권한 설정
RUN chown -R node:node /app && \
    chmod +x /app/*.sh 2>/dev/null || true

# 비root 사용자로 전환
USER node

# 포트 노출
EXPOSE 8080

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 애플리케이션 시작
CMD ["node", "server.js"]