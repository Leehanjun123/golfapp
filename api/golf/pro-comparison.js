// Vercel Serverless Function - Pro Comparison
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
      const comparison = {
        success: true,
        comparison: {
          user_percentile: Math.floor(Math.random() * 40) + 60, // 60-100 백분위
          pro_standards: {
            club_speed: 113,
            ball_speed: 167,
            launch_angle: 10.9,
            spin_rate: 2686,
            carry_distance: 275
          },
          user_metrics: {
            club_speed: Math.floor(Math.random() * 20) + 95, // 95-115
            ball_speed: Math.floor(Math.random() * 30) + 140, // 140-170
            launch_angle: (Math.random() * 5 + 8).toFixed(1), // 8-13도
            spin_rate: Math.floor(Math.random() * 1000) + 2200, // 2200-3200
            carry_distance: Math.floor(Math.random() * 50) + 230 // 230-280
          },
          improvement_areas: [
            '클럽 스피드를 8% 향상시키면 프로 수준에 근접합니다',
            '런치 앵글을 1.2도 조정하여 비거리를 늘릴 수 있습니다',
            '스핀율을 300rpm 줄이면 더 안정적인 볼 플라이트를 얻을 수 있습니다'
          ],
          strength_areas: [
            '볼 스피드가 프로 평균의 94%로 매우 우수합니다',
            '캐리 거리가 일관성 있게 유지되고 있습니다'
          ]
        }
      };

      return res.status(200).json(comparison);
    }

    if (req.method === 'POST') {
      const { user_data } = req.body || {};
      
      // 사용자 데이터 기반 비교 분석
      const detailedComparison = {
        success: true,
        comparison: {
          overall_ranking: Math.floor(Math.random() * 20) + 75, // 75-95 백분위
          detailed_metrics: {
            power: {
              user_score: user_data?.power || Math.floor(Math.random() * 30) + 70,
              pro_average: 92,
              percentile: Math.floor(Math.random() * 25) + 70
            },
            accuracy: {
              user_score: user_data?.accuracy || Math.floor(Math.random() * 25) + 75,
              pro_average: 94,
              percentile: Math.floor(Math.random() * 20) + 75
            },
            consistency: {
              user_score: user_data?.consistency || Math.floor(Math.random() * 30) + 65,
              pro_average: 89,
              percentile: Math.floor(Math.random() * 30) + 65
            }
          },
          gap_analysis: {
            biggest_gap: 'consistency',
            improvement_potential: '프로 수준까지 15점 향상 가능',
            timeline: '꾸준한 연습으로 6개월 내 달성 가능'
          },
          personalized_plan: [
            '일관성 향상을 위한 루틴 연습',
            '정확도 개선을 위한 타겟 훈련',
            '파워 증대를 위한 체력 강화'
          ]
        }
      };

      return res.status(200).json(detailedComparison);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Pro comparison error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Pro comparison failed',
      message: error.message 
    });
  }
};