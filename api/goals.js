// Vercel Serverless Function - Goals
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
      const goalsData = {
        success: true,
        goals: [
          {
            id: 'goal_1',
            title: '스윙 정확도 90% 달성',
            description: '일관된 정확도로 스윙 실력 향상',
            category: 'accuracy',
            target_value: 90,
            current_value: 85,
            progress: 85,
            unit: '%',
            deadline: new Date(Date.now() + 1209600000).toISOString(), // 2주 후
            status: 'active',
            priority: 'high',
            created_at: '2025-08-20',
            milestones: [
              { value: 80, achieved: true, date: '2025-08-25' },
              { value: 85, achieved: true, date: '2025-08-28' },
              { value: 90, achieved: false, expected: '2025-09-10' }
            ]
          },
          {
            id: 'goal_2', 
            title: '일주일 연속 연습',
            description: '꾸준한 연습 습관 만들기',
            category: 'consistency',
            target_value: 7,
            current_value: 5,
            progress: 71,
            unit: '일',
            deadline: new Date(Date.now() + 259200000).toISOString(), // 3일 후
            status: 'active',
            priority: 'medium',
            created_at: '2025-08-22',
            streak: 5,
            best_streak: 5
          },
          {
            id: 'goal_3',
            title: '평균 점수 80점 돌파',
            description: '전체적인 스윙 품질 향상',
            category: 'score',
            target_value: 80,
            current_value: 78.5,
            progress: 94,
            unit: '점',
            deadline: new Date(Date.now() + 2419200000).toISOString(), // 4주 후
            status: 'active',
            priority: 'high',
            created_at: '2025-08-15',
            recent_scores: [76, 78, 79, 81, 78]
          },
          {
            id: 'goal_4',
            title: '백스윙 각도 일관성 향상',
            description: '백스윙 각도 편차 5도 이내 유지',
            category: 'technique',
            target_value: 5,
            current_value: 8,
            progress: 60,
            unit: '도',
            deadline: new Date(Date.now() + 1814400000).toISOString(), // 3주 후
            status: 'active',
            priority: 'medium',
            created_at: '2025-08-18'
          }
        ],
        completed_goals: [
          {
            id: 'goal_completed_1',
            title: '첫 스윙 분석 완료',
            completed_at: '2025-08-20',
            achievement_unlocked: '첫걸음 배지'
          }
        ],
        categories: [
          { id: 'accuracy', name: '정확도', icon: '🎯', active_count: 1 },
          { id: 'consistency', name: '일관성', icon: '📊', active_count: 1 },
          { id: 'score', name: '점수', icon: '⭐', active_count: 1 },
          { id: 'technique', name: '기술', icon: '🔧', active_count: 1 },
          { id: 'fitness', name: '체력', icon: '💪', active_count: 0 }
        ],
        statistics: {
          total_goals: 5,
          active_goals: 4,
          completed_goals: 1,
          average_progress: 77.5,
          completion_rate: 20
        }
      };

      return res.status(200).json(goalsData);
    }

    if (req.method === 'POST') {
      const { title, description, category, target_value, deadline, priority } = req.body || {};

      if (!title || !target_value) {
        return res.status(400).json({
          success: false,
          error: 'Title and target value are required'
        });
      }

      const newGoal = {
        success: true,
        goal: {
          id: `goal_${Date.now()}`,
          title,
          description: description || '',
          category: category || 'general',
          target_value: Number(target_value),
          current_value: 0,
          progress: 0,
          unit: '%',
          deadline: deadline || new Date(Date.now() + 2419200000).toISOString(),
          status: 'active',
          priority: priority || 'medium',
          created_at: new Date().toISOString()
        }
      };

      return res.status(201).json(newGoal);
    }

    if (req.method === 'PUT') {
      const { goal_id, current_value, status } = req.body || {};

      if (!goal_id) {
        return res.status(400).json({
          success: false,
          error: 'Goal ID is required'
        });
      }

      const updatedGoal = {
        success: true,
        message: '목표가 업데이트되었습니다!',
        goal: {
          id: goal_id,
          current_value: current_value || 0,
          progress: Math.min(100, (current_value || 0)),
          status: status || 'active',
          updated_at: new Date().toISOString()
        }
      };

      // 목표 달성 체크
      if (current_value >= 100 || status === 'completed') {
        updatedGoal.achievement = {
          message: '🎉 목표를 달성했습니다!',
          badge_earned: '목표 달성자',
          points_earned: 100
        };
      }

      return res.status(200).json(updatedGoal);
    }

    if (req.method === 'DELETE') {
      const { goal_id } = req.body || {};

      return res.status(200).json({
        success: true,
        message: '목표가 삭제되었습니다.',
        deleted_goal_id: goal_id,
        deleted_at: new Date().toISOString()
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Goals error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Goals operation failed',
      message: error.message 
    });
  }
};