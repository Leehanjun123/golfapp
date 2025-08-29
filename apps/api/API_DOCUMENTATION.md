# 🏌️ Golf AI API Documentation

## 📋 개요

Golf AI 앱의 REST API 문서입니다. AI 기반 골프 스윙 분석, 사용자 관리, 피드백 시스템 등의 기능을 제공합니다.

## 🔗 Base URL

```
Production: https://api.golfai.app
Staging: https://staging-api.golfai.app
Development: http://localhost:8080
```

## 🔐 인증

대부분의 API는 JWT 토큰을 통한 인증이 필요합니다.

### 인증 헤더
```
Authorization: Bearer <jwt_token>
```

## 📡 API 엔드포인트

### 1. 헬스 체크

#### GET /health
서버 상태를 확인합니다.

**응답**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": "150MB",
    "heapUsed": "80MB",
    "heapTotal": "120MB"
  }
}
```

#### GET /livez
Kubernetes liveness probe용 엔드포인트입니다.

**응답**
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /readyz
Kubernetes readiness probe용 엔드포인트입니다.

**응답**
```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dependencies": {
    "database": "connected",
    "redis": "connected",
    "ai_model": "loaded"
  }
}
```

### 2. 골프 분석 API

#### POST /api/v1/golf/analyze
골프 스윙 동영상이나 이미지를 분석합니다.

**요청**
```json
{
  "mediaData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
  "analysisType": "swing", // "swing", "posture", "grip"
  "userId": "user123" // 선택사항
}
```

**응답**
```json
{
  "success": true,
  "data": {
    "score": 85,
    "analysis": {
      "posture": {
        "score": 88,
        "feedback": "자세가 전반적으로 좋습니다."
      },
      "swing_path": {
        "score": 82,
        "feedback": "백스윙 각도를 조금 더 늘려보세요."
      },
      "balance": {
        "score": 87,
        "feedback": "균형이 잘 잡혀있습니다."
      }
    },
    "recommendations": [
      "왼발에 더 많은 체중을 실어보세요",
      "백스윙 시 어깨 회전을 더 크게 해보세요"
    ],
    "confidence": 0.92,
    "processing_time": 2.3
  }
}
```

#### POST /api/v1/golf/analyze-test
테스트용 골프 분석 엔드포인트입니다. 부하 테스트에 사용됩니다.

**요청**
```json
{
  "mediaData": "data:image/jpeg;base64,iVBORw0KGg..."
}
```

**응답**
```json
{
  "success": true,
  "data": {
    "score": 75,
    "analysis_time": 1.2,
    "test_mode": true
  }
}
```

### 3. 사용자 관리 API

#### POST /api/v1/auth/register
새 사용자를 등록합니다.

**요청**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "golfer123",
  "profile": {
    "handicap": 18,
    "experience": "beginner" // "beginner", "intermediate", "advanced"
  }
}
```

**응답**
```json
{
  "success": true,
  "data": {
    "userId": "user_12345",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "email": "user@example.com",
      "username": "golfer123",
      "profile": {
        "handicap": 18,
        "experience": "beginner"
      }
    }
  }
}
```

#### POST /api/v1/auth/login
사용자 로그인을 처리합니다.

**요청**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**응답**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_12345",
      "email": "user@example.com",
      "username": "golfer123"
    }
  }
}
```

#### GET /api/v1/user/profile
사용자 프로필을 조회합니다. (인증 필요)

**응답**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_12345",
      "email": "user@example.com",
      "username": "golfer123",
      "profile": {
        "handicap": 18,
        "experience": "beginner",
        "total_analyses": 25,
        "avg_score": 78.5
      },
      "created_at": "2024-01-10T09:00:00.000Z"
    }
  }
}
```

### 4. 분석 기록 API

#### GET /api/v1/user/analyses
사용자의 분석 기록을 조회합니다. (인증 필요)

**쿼리 파라미터**
- `limit`: 최대 개수 (기본값: 20)
- `offset`: 시작 위치 (기본값: 0)
- `sort`: 정렬 기준 ("date", "score")

**응답**
```json
{
  "success": true,
  "data": {
    "analyses": [
      {
        "id": "analysis_123",
        "score": 85,
        "created_at": "2024-01-15T10:30:00.000Z",
        "analysis": {
          "posture": { "score": 88 },
          "swing_path": { "score": 82 },
          "balance": { "score": 87 }
        }
      }
    ],
    "total": 25,
    "limit": 20,
    "offset": 0
  }
}
```

#### GET /api/v1/user/analyses/{analysisId}
특정 분석 결과를 상세 조회합니다. (인증 필요)

**응답**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": "analysis_123",
      "score": 85,
      "created_at": "2024-01-15T10:30:00.000Z",
      "analysis": {
        "posture": {
          "score": 88,
          "feedback": "자세가 전반적으로 좋습니다.",
          "details": {
            "spine_angle": 85,
            "shoulder_alignment": 92
          }
        }
      },
      "recommendations": [
        "왼발에 더 많은 체중을 실어보세요"
      ],
      "media_url": "/uploads/analysis_123.jpg"
    }
  }
}
```

### 5. 피드백 API

#### POST /api/v1/feedback
사용자 피드백을 제출합니다.

**요청**
```json
{
  "category": "accuracy", // "accuracy", "performance", "ui_ux", "bug_report", "feature_request"
  "rating": 4,
  "title": "분석 정확도가 좋아요",
  "content": "AI 분석이 정확하고 도움이 많이 됩니다.",
  "userId": "user_123" // 선택사항
}
```

**응답**
```json
{
  "success": true,
  "data": {
    "feedbackId": "feedback_456",
    "message": "피드백을 제출해주셔서 감사합니다!"
  }
}
```

#### GET /api/v1/feedback
피드백 목록을 조회합니다. (관리자용)

**쿼리 파라미터**
- `category`: 카테고리 필터
- `rating`: 평점 필터
- `limit`: 최대 개수 (기본값: 50)
- `offset`: 시작 위치 (기본값: 0)

**응답**
```json
{
  "success": true,
  "data": {
    "feedback": [
      {
        "id": "feedback_456",
        "category": "accuracy",
        "rating": 4,
        "title": "분석 정확도가 좋아요",
        "content": "AI 분석이 정확하고 도움이 많이 됩니다.",
        "sentiment": "positive",
        "created_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

### 6. A/B 테스팅 API

#### GET /api/v1/experiments
실행 중인 A/B 테스트 실험 목록을 조회합니다.

**응답**
```json
{
  "success": true,
  "data": {
    "experiments": [
      {
        "id": "ai_model_comparison",
        "name": "AI 모델 성능 비교",
        "status": "active",
        "participants": 500
      }
    ]
  }
}
```

#### POST /api/v1/experiments/{experimentId}/assign
사용자를 실험에 배정합니다.

**요청**
```json
{
  "userId": "user_123"
}
```

**응답**
```json
{
  "success": true,
  "data": {
    "experimentId": "ai_model_comparison",
    "variant": "treatment",
    "config": {
      "aiModel": "pro_golf_analyzer",
      "confidenceThreshold": 0.8
    }
  }
}
```

### 7. 통계 및 분석 API

#### GET /api/v1/analytics/overview
전체 서비스 통계를 조회합니다. (관리자용)

**응답**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1500,
      "active_this_month": 450,
      "new_this_month": 120
    },
    "analyses": {
      "total": 5800,
      "this_month": 1200,
      "avg_score": 76.5
    },
    "feedback": {
      "total": 250,
      "avg_rating": 4.2,
      "satisfaction_rate": 85.2
    }
  }
}
```

## 🚨 에러 코드

### HTTP 상태 코드
- `200`: 성공
- `400`: 잘못된 요청
- `401`: 인증 실패
- `403`: 권한 없음
- `404`: 리소스 없음
- `429`: 요청 제한 초과
- `500`: 서버 오류

### 에러 응답 형식
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "요청 데이터가 올바르지 않습니다.",
    "details": {
      "field": "mediaData",
      "issue": "required"
    }
  }
}
```

### 주요 에러 코드
- `INVALID_REQUEST`: 잘못된 요청 데이터
- `UNAUTHORIZED`: 인증 토큰 없음/만료
- `FORBIDDEN`: 접근 권한 없음
- `RATE_LIMIT_EXCEEDED`: 요청 제한 초과
- `ANALYSIS_FAILED`: AI 분석 실패
- `FILE_TOO_LARGE`: 파일 크기 초과
- `UNSUPPORTED_FORMAT`: 지원하지 않는 파일 형식

## 📊 Rate Limiting

### 제한 정책
- **일반 API**: 분당 100회
- **분석 API**: 분당 30회
- **인증 API**: 15분당 5회 (실패 시)

### Rate Limit 헤더
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## 📝 요청/응답 예제

### cURL 예제

#### 골프 분석 요청
```bash
curl -X POST https://api.golfai.app/api/v1/golf/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "mediaData": "data:image/jpeg;base64,/9j/4AAQ...",
    "analysisType": "swing"
  }'
```

#### 피드백 제출
```bash
curl -X POST https://api.golfai.app/api/v1/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "category": "accuracy",
    "rating": 5,
    "content": "분석이 매우 정확해요!"
  }'
```

### JavaScript 예제

```javascript
// 골프 분석 요청
const analyzeSwing = async (imageData) => {
  const response = await fetch('/api/v1/golf/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      mediaData: imageData,
      analysisType: 'swing'
    })
  });
  
  const result = await response.json();
  return result;
};

// 사용자 프로필 조회
const getUserProfile = async () => {
  const response = await fetch('/api/v1/user/profile', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  const profile = await response.json();
  return profile;
};
```

## 🔄 Webhook

### 분석 완료 Webhook
분석이 완료되면 지정된 URL로 결과를 전송합니다.

**요청**
```json
{
  "event": "analysis_completed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "analysisId": "analysis_123",
    "userId": "user_123",
    "score": 85,
    "status": "completed"
  }
}
```

## 🧪 테스트 환경

### 테스트 데이터
개발/테스트 환경에서 사용할 수 있는 샘플 데이터:

```javascript
// 테스트용 이미지 데이터 (1x1 픽셀)
const testImage = 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// 테스트용 사용자 계정
const testUser = {
  email: 'test@test.com',
  password: 'test123'
};
```

### API 테스트 도구
- **Postman Collection**: `/docs/Golf_AI_API.postman_collection.json`
- **Swagger UI**: `https://api.golfai.app/docs`
- **부하 테스트**: `node load-test.js`

## 📚 SDK 및 라이브러리

### JavaScript SDK (예정)
```javascript
import { GolfAI } from '@golfai/sdk';

const client = new GolfAI({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.golfai.app'
});

// 스윙 분석
const result = await client.analyzeSwing(imageData);
```

### Python SDK (예정)
```python
from golfai import GolfAI

client = GolfAI(
    api_key='your_api_key',
    base_url='https://api.golfai.app'
)

# 스윙 분석
result = client.analyze_swing(image_data)
```

---

## 📞 지원

### 문의사항
- **이메일**: support@golfai.app
- **Slack**: [Developer Community](https://golfai.slack.com)
- **GitHub Issues**: [Repository](https://github.com/your-username/golf-ai-app/issues)

### 업데이트 및 공지
- **Changelog**: `/docs/CHANGELOG.md`
- **API 버전 정책**: 메이저 버전 업데이트 시 6개월 지원 기간
- **Breaking Changes**: 최소 30일 전 공지

---

**🎯 Golf AI API를 활용하여 최고의 골프 트레이닝 경험을 만들어보세요!**