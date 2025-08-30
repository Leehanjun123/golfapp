// Vercel Serverless Function - Challenges
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
      const challenges = {
        success: true,
        challenges: [
          {
            id: 'challenge_daily_1',
            title: '데일리 정확도 챌린지',
            description: '오늘 스윙 정확도 90% 이상 달성하기',
            type: 'daily',
            difficulty: 'medium',
            reward: '50 포인트',
            progress: 75,
            target: 90,
            participants: 324,
            time_left: '5시간 23분',
            status: 'active'
          },
          {
            id: 'challenge_weekly_1',
            title: '일주일 연속 연습',
            description: '7일 동안 매일 최소 5번 스윙 분석',
            type: 'weekly',
            difficulty: 'hard',
            reward: '200 포인트 + 배지',
            progress: 71,
            target: 100,
            participants: 158,
            time_left: '3일 12시간',
            status: 'active'
          },
          {
            id: 'challenge_social_1',
            title: '친구와 스코어 대결',
            description: '친구보다 높은 평균 점수 달성하기',
            type: 'social',
            difficulty: 'medium',
            reward: '100 포인트',
            progress: 85,
            target: 100,
            participants: 12,
            time_left: '2일 8시간',
            status: 'active'
          },
          {
            id: 'challenge_skill_1',
            title: '백스윙 마스터',
            description: '백스윙 각도 일관성 95% 이상 유지',
            type: 'skill',
            difficulty: 'expert',
            reward: '300 포인트 + 특별 배지',
            progress: 45,
            target: 95,
            participants: 67,
            time_left: '6일 14시간',
            status: 'active'
          }
        ],
        user_challenges: [
          {
            id: 'challenge_daily_1',
            joined_at: new Date(Date.now() - 86400000).toISOString(),
            current_progress: 75,
            best_score: 88,
            attempts: 12
          },
          {
            id: 'challenge_weekly_1', 
            joined_at: new Date(Date.now() - 432000000).toISOString(),
            current_progress: 71,
            days_completed: 5,
            streak: 5
          }
        ]
      };

      return res.status(200).json(challenges);
    }

    if (req.method === 'POST') {
      const { challenge_id, action } = req.body || {};

      if (action === 'join') {
        return res.status(200).json({
          success: true,
          message: '챌린지에 참여했습니다!',
          challenge_id,
          joined_at: new Date().toISOString()
        });
      }

      if (action === 'update_progress') {
        const { score } = req.body;
        return res.status(200).json({
          success: true,
          message: '진행 상황이 업데이트되었습니다!',
          new_progress: Math.min(100, (score || 0) + Math.floor(Math.random() * 10)),
          points_earned: Math.floor(Math.random() * 20) + 5
        });
      }

      // 새 챌린지 생성
      const { title, description, type, difficulty, target } = req.body;
      const newChallenge = {
        success: true,
        challenge: {
          id: `challenge_${Date.now()}`,
          title: title || '새로운 챌린지',
          description: description || '사용자 맞춤 챌린지',
          type: type || 'custom',
          difficulty: difficulty || 'medium',
          target: target || 100,
          progress: 0,
          created_at: new Date().toISOString(),
          creator: 'user',
          status: 'active'
        }
      };

      return res.status(201).json(newChallenge);
    }

    if (req.method === 'PUT') {
      const { challenge_id } = req.body || {};
      
      return res.status(200).json({
        success: true,
        message: '챌린지가 업데이트되었습니다!',
        challenge_id,
        updated_at: new Date().toISOString()
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Challenges error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Challenges operation failed',
      message: error.message 
    });
  }
};