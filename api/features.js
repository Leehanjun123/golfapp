// Vercel Serverless Function - Additional Features (Goals + Challenges + Personal AI)
module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const feature = url.searchParams.get('feature') || 'goals';

    // Goals functionality
    if (feature === 'goals') {
      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          goals: [
            {
              id: 'goal_1',
              title: '스윙 정확도 90% 달성',
              target_value: 90,
              current_value: 85,
              progress: 85,
              status: 'active'
            }
          ]
        });
      }

      if (req.method === 'POST') {
        const { title, target_value } = req.body || {};
        return res.status(201).json({
          success: true,
          goal: {
            id: `goal_${Date.now()}`,
            title: title || '새 목표',
            target_value: target_value || 100,
            current_value: 0,
            progress: 0,
            status: 'active'
          }
        });
      }
    }

    // Challenges functionality
    if (feature === 'challenges') {
      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          challenges: [
            {
              id: 'challenge_1',
              title: '데일리 정확도 챌린지',
              description: '오늘 스윙 정확도 90% 이상 달성하기',
              progress: 75,
              target: 90,
              status: 'active'
            }
          ]
        });
      }

      if (req.method === 'POST') {
        const { action, challenge_id } = req.body || {};
        return res.status(200).json({
          success: true,
          message: action === 'join' ? '챌린지에 참여했습니다!' : '업데이트되었습니다!',
          challenge_id
        });
      }
    }

    // Personal AI functionality
    if (feature === 'personal-ai') {
      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          ai_profile: {
            name: '개인 맞춤 AI 코치',
            personality: 'friendly_professional',
            learning_progress: 85,
            total_interactions: 127
          }
        });
      }

      if (req.method === 'POST') {
        const { action } = req.body || {};
        
        const tips = [
          '백스윙 시 왼팔을 조금 더 곧게 펴보세요.',
          '하체 회전을 먼저 시작하면 더 강한 임팩트를 만들 수 있습니다.',
          '그립 압력을 10% 정도 줄이면 더 자연스러운 스윙이 가능합니다.'
        ];

        return res.status(200).json({
          success: true,
          ai_response: {
            message: action === 'get_personalized_tip' 
              ? tips[Math.floor(Math.random() * tips.length)]
              : '좋은 질문이네요! 더 구체적으로 설명해주시면 더 도움이 될 답변을 드릴 수 있어요.',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    return res.status(400).json({ error: 'Invalid feature parameter' });
    
  } catch (error) {
    console.error('Features error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Features operation failed',
      message: error.message 
    });
  }
};