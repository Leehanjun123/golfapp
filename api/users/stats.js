// Vercel Serverless Function - User Statistics
module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // /detailed 경로 처리
      const isDetailed = req.url.includes('/detailed');
      
      if (isDetailed) {
        const detailedStats = {
          success: true,
          data: {
            user_info: {
              username: 'Golf User',
              handicap: 18,
              subscription_tier: 'premium',
              total_swings_analyzed: 245,
              avg_score: 85.4
            },
            stats: {
              total_swings: 245,
              avg_score: 85.4,
              handicap: 18,
              subscription: 'premium'
            },
            recent_analyses: [
              {
                id: 'analysis_1',
                phase: 'Backswing',
                similarity_score: 92,
                confidence: 88,
                created_at: new Date(Date.now() - 86400000).toISOString()
              },
              {
                id: 'analysis_2', 
                phase: 'Impact',
                similarity_score: 89,
                confidence: 91,
                created_at: new Date(Date.now() - 172800000).toISOString()
              },
              {
                id: 'analysis_3',
                phase: 'Follow Through',
                similarity_score: 85,
                confidence: 87,
                created_at: new Date(Date.now() - 259200000).toISOString()
              }
            ],
            active_challenges: [
              {
                id: 'challenge_1',
                title: '일주일 연속 연습',
                progress: 71,
                target_value: 100
              },
              {
                id: 'challenge_2',
                title: '정확도 90% 달성',
                progress: 85,
                target_value: 90
              }
            ],
            achievements: [
              { badge: '첫 스윙 마스터', earned: '2025-08-20' },
              { badge: '일관성 왕', earned: '2025-08-25' },
              { badge: '정확도 달인', earned: '2025-08-28' }
            ],
            performance_history: {
              dates: [
                new Date(Date.now() - 6*86400000).toISOString().split('T')[0],
                new Date(Date.now() - 5*86400000).toISOString().split('T')[0],
                new Date(Date.now() - 4*86400000).toISOString().split('T')[0],
                new Date(Date.now() - 3*86400000).toISOString().split('T')[0],
                new Date(Date.now() - 2*86400000).toISOString().split('T')[0],
                new Date(Date.now() - 1*86400000).toISOString().split('T')[0],
                new Date().toISOString().split('T')[0]
              ],
              scores: [82, 84, 83, 87, 89, 88, 91],
              accuracy: [85, 87, 86, 90, 92, 91, 94]
            },
            phase_breakdown: {
              address: 25,
              backswing: 30,
              impact: 25,
              follow_through: 20
            }
          }
        };

        return res.status(200).json(detailedStats);
      }

      // 기본 stats
      const basicStats = {
        success: true,
        data: {
          total_swings: 245,
          avg_score: 85.4,
          best_score: 94,
          improvement_rate: 12.5,
          last_play_date: new Date().toISOString()
        }
      };

      return res.status(200).json(basicStats);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Stats operation failed',
      message: error.message 
    });
  }
};