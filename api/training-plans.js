// Vercel Serverless Function - Training Plans
module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const trainingPlans = {
        success: true,
        plans: [
          {
            id: 'plan_beginner_1',
            title: '골프 입문자 4주 완성 과정',
            level: 'beginner',
            duration: 28,
            difficulty: 'easy',
            description: '골프를 처음 시작하는 분을 위한 기초 과정입니다.',
            objectives: [
              '올바른 그립과 자세 습득',
              '기본 스윙 모션 이해',
              '클럽별 사용법 학습',
              '골프 에티켓 및 룰 학습'
            ],
            exercises: [
              {
                id: 'ex_1',
                name: '그립 연습',
                description: '올바른 그립 방법 익히기',
                duration: 15,
                repetitions: 50,
                week: 1,
                completed: false
              },
              {
                id: 'ex_2',
                name: '어드레스 자세',
                description: '정확한 준비 자세 만들기',
                duration: 20,
                repetitions: 30,
                week: 1,
                completed: false
              },
              {
                id: 'ex_3',
                name: '하프 스윙',
                description: '작은 스윙으로 감각 익히기',
                duration: 25,
                repetitions: 40,
                week: 2,
                completed: false
              }
            ],
            progress: 0,
            estimated_improvement: '기초 실력 40% 향상',
            created_at: '2025-08-29',
            tags: ['기초', '입문', '자세']
          },
          {
            id: 'plan_intermediate_1',
            title: '중급자 정확도 향상 프로그램',
            level: 'intermediate',
            duration: 21,
            difficulty: 'medium',
            description: '기본기는 있지만 정확도를 높이고 싶은 분을 위한 프로그램',
            objectives: [
              '스윙 일관성 향상',
              '방향성 개선',
              '거리 조절 능력 향상',
              '다양한 라이 상황 대응'
            ],
            exercises: [
              {
                id: 'ex_4',
                name: '타겟 연습',
                description: '정확한 목표 지향 연습',
                duration: 30,
                repetitions: 60,
                week: 1,
                completed: false
              },
              {
                id: 'ex_5',
                name: '템포 컨트롤',
                description: '일정한 리듬으로 스윙하기',
                duration: 25,
                repetitions: 45,
                week: 2,
                completed: false
              },
              {
                id: 'ex_6',
                name: '거리별 연습',
                description: '다양한 거리 조절 연습',
                duration: 35,
                repetitions: 50,
                week: 3,
                completed: false
              }
            ],
            progress: 23,
            estimated_improvement: '정확도 25% 향상',
            created_at: '2025-08-28',
            tags: ['중급', '정확도', '일관성']
          },
          {
            id: 'plan_advanced_1',
            title: '상급자 프로 수준 도전 코스',
            level: 'advanced',
            duration: 35,
            difficulty: 'hard',
            description: '프로 수준의 정밀한 기술을 익히고 싶은 상급자를 위한 과정',
            objectives: [
              '프로급 정밀도 달성',
              '고난도 상황 대응력',
              '멘탈 게임 강화',
              '경기 전략 수립'
            ],
            exercises: [
              {
                id: 'ex_7',
                name: '정밀 타겟 훈련',
                description: '1m 이내 정확도 달성',
                duration: 45,
                repetitions: 100,
                week: 1,
                completed: false
              },
              {
                id: 'ex_8',
                name: '압박 상황 연습',
                description: '스트레스 상황에서의 스윙',
                duration: 40,
                repetitions: 80,
                week: 2,
                completed: false
              },
              {
                id: 'ex_9',
                name: '코스 전략 시뮬레이션',
                description: '실전 코스 상황 연습',
                duration: 50,
                repetitions: 60,
                week: 4,
                completed: false
              }
            ],
            progress: 8,
            estimated_improvement: '프로 수준 95% 달성',
            created_at: '2025-08-27',
            tags: ['상급', '프로급', '전략']
          }
        ],
        user_plans: [
          {
            id: 'plan_intermediate_1',
            enrolled_at: '2025-08-28',
            current_week: 2,
            completed_exercises: 3,
            total_exercises: 9,
            next_exercise: {
              name: '템포 컨트롤',
              scheduled_for: new Date(Date.now() + 86400000).toISOString()
            }
          }
        ],
        categories: [
          { id: 'all', name: '전체', count: 12 },
          { id: 'beginner', name: '초급', count: 4 },
          { id: 'intermediate', name: '중급', count: 5 },
          { id: 'advanced', name: '상급', count: 3 }
        ]
      };

      return res.status(200).json(trainingPlans);
    }

    if (req.method === 'POST') {
      const { plan_id, action } = req.body || {};

      if (action === 'enroll') {
        return res.status(200).json({
          success: true,
          message: '훈련 계획에 등록되었습니다!',
          plan_id,
          enrolled_at: new Date().toISOString(),
          next_session: new Date(Date.now() + 86400000).toISOString()
        });
      }

      if (action === 'complete_exercise') {
        const { exercise_id, score } = req.body;
        return res.status(200).json({
          success: true,
          message: '운동이 완료되었습니다!',
          exercise_id,
          score: score || Math.floor(Math.random() * 20) + 80,
          points_earned: Math.floor(Math.random() * 30) + 20,
          completed_at: new Date().toISOString()
        });
      }

      // 새 훈련 계획 생성
      const { title, level, duration, exercises } = req.body;
      const newPlan = {
        success: true,
        plan: {
          id: `plan_custom_${Date.now()}`,
          title: title || '맞춤형 훈련 계획',
          level: level || 'intermediate',
          duration: duration || 14,
          difficulty: 'custom',
          description: '사용자 맞춤형 훈련 계획',
          exercises: exercises || [],
          created_at: new Date().toISOString(),
          creator: 'user',
          is_custom: true
        }
      };

      return res.status(201).json(newPlan);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Training plans error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Training plans operation failed',
      message: error.message 
    });
  }
};