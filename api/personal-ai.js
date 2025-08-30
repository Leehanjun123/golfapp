// Vercel Serverless Function - Personal AI
module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const personalAI = {
        success: true,
        ai_profile: {
          name: '개인 맞춤 AI 코치',
          personality: 'friendly_professional',
          expertise_level: 'expert',
          specialization: ['스윙 분석', '개인화 훈련', '멘탈 코칭'],
          learning_progress: 85,
          total_interactions: 127,
          created_at: '2025-08-15',
          last_interaction: new Date().toISOString()
        },
        capabilities: {
          swing_analysis: true,
          personalized_tips: true,
          progress_tracking: true,
          mental_coaching: true,
          technique_videos: true,
          live_feedback: true
        },
        recent_insights: [
          {
            type: 'pattern_detected',
            message: '최근 스윙에서 백스윙 일관성이 15% 향상되었습니다!',
            confidence: 92,
            timestamp: new Date(Date.now() - 86400000).toISOString()
          },
          {
            type: 'improvement_suggestion',
            message: '오후 시간대 연습 시 더 좋은 결과를 보이고 있습니다',
            confidence: 87,
            timestamp: new Date(Date.now() - 172800000).toISOString()
          }
        ]
      };

      return res.status(200).json(personalAI);
    }

    if (req.method === 'POST') {
      const { action, data } = req.body || {};

      if (action === 'analyze_pattern') {
        const analysis = {
          success: true,
          pattern_analysis: {
            trend: 'improving',
            confidence: Math.floor(Math.random() * 20) + 80,
            key_insights: [
              '스윙 템포가 더욱 일정해지고 있습니다',
              '백스윙 높이가 최적화되었습니다',
              '임팩트 순간의 정확도가 향상되었습니다'
            ],
            recommendations: [
              '현재 리듬을 유지하며 연습하세요',
              '더 다양한 클럽으로 확장 연습해보세요',
              '실제 코스에서의 적용을 시도해보세요'
            ],
            next_focus_area: 'short_game',
            estimated_improvement_time: '2-3주'
          }
        };

        return res.status(200).json(analysis);
      }

      if (action === 'get_personalized_tip') {
        const tips = [
          '당신의 스윙 패턴을 보면 아침 시간대에 더 좋은 결과를 얻을 수 있습니다.',
          '백스윙 시 왼팔을 조금 더 곧게 펴면 일관성이 향상됩니다.',
          '하체 회전을 먼저 시작하면 더 강한 임팩트를 만들 수 있습니다.',
          '팔로우스루에서 클럽을 목표 방향으로 더 길게 뻗어보세요.',
          '그립 압력을 10% 정도 줄이면 더 자연스러운 스윙이 가능합니다.'
        ];

        const personalizedTip = {
          success: true,
          tip: {
            message: tips[Math.floor(Math.random() * tips.length)],
            category: ['technique', 'timing', 'mental', 'equipment'][Math.floor(Math.random() * 4)],
            difficulty: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
            estimated_impact: 'high',
            practice_time: `${Math.floor(Math.random() * 20) + 10}분`,
            created_at: new Date().toISOString()
          }
        };

        return res.status(200).json(personalizedTip);
      }

      // 기본 개인 AI 상호작용
      const response = {
        success: true,
        ai_response: {
          message: '안녕하세요! 오늘도 골프 실력 향상을 위해 열심히 하고 계시는군요. 어떤 도움이 필요하신가요?',
          suggestions: [
            '최근 스윙 패턴 분석하기',
            '개인 맞춤 팁 받기',
            '약점 개선 계획 세우기',
            '목표 설정하기'
          ],
          mood: 'encouraging',
          timestamp: new Date().toISOString()
        }
      };

      return res.status(200).json(response);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Personal AI error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Personal AI operation failed',
      message: error.message 
    });
  }
};