// Vercel Serverless Function - Leaderboard
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
      // 쿼리 파라미터 파싱
      const url = new URL(req.url, `http://${req.headers.host}`);
      const timeframe = url.searchParams.get('timeframe') || 'weekly';
      const category = url.searchParams.get('category') || 'overall';

      // 리더보드 데이터 생성
      const generateLeaderboard = (timeframe, category) => {
        const players = [
          { name: 'Tiger Pro', avatar: '🏆', level: 'Pro' },
          { name: 'Eagle Master', avatar: '🦅', level: 'Expert' },
          { name: 'Golf User', avatar: '⛳', level: 'Advanced' }, // 현재 사용자
          { name: 'Birdie King', avatar: '🐦', level: 'Advanced' },
          { name: 'Par Achiever', avatar: '🎯', level: 'Intermediate' },
          { name: 'Swing Rookie', avatar: '⭐', level: 'Beginner' },
          { name: 'Drive Queen', avatar: '👑', level: 'Expert' },
          { name: 'Putt Master', avatar: '🥇', level: 'Pro' },
          { name: 'Ace Hunter', avatar: '🎪', level: 'Advanced' },
          { name: 'Fairway Hero', avatar: '🚀', level: 'Intermediate' }
        ];

        return players.map((player, index) => ({
          rank: index + 1,
          user_id: `user_${index + 1}`,
          username: player.name,
          avatar: player.avatar,
          score: 95 - (index * 3) + Math.floor(Math.random() * 5),
          level: player.level,
          total_swings: Math.floor(Math.random() * 200) + 100,
          accuracy: 95 - (index * 2) + Math.floor(Math.random() * 4),
          improvement: Math.floor(Math.random() * 20) - 5,
          streak: Math.floor(Math.random() * 15) + 1,
          badges: Math.floor(Math.random() * 8) + index,
          is_current_user: player.name === 'Golf User',
          country: index < 3 ? 'KR' : ['US', 'JP', 'GB', 'AU', 'CA'][Math.floor(Math.random() * 5)]
        }));
      };

      const leaderboardData = {
        success: true,
        leaderboard: {
          timeframe,
          category,
          last_updated: new Date().toISOString(),
          total_participants: Math.floor(Math.random() * 1000) + 500,
          current_user_rank: 3,
          rankings: generateLeaderboard(timeframe, category),
          categories: [
            { id: 'overall', name: '종합 점수', active: category === 'overall' },
            { id: 'accuracy', name: '정확도', active: category === 'accuracy' },
            { id: 'consistency', name: '일관성', active: category === 'consistency' },
            { id: 'improvement', name: '개선율', active: category === 'improvement' }
          ],
          timeframes: [
            { id: 'daily', name: '오늘', active: timeframe === 'daily' },
            { id: 'weekly', name: '이번 주', active: timeframe === 'weekly' },
            { id: 'monthly', name: '이번 달', active: timeframe === 'monthly' },
            { id: 'all_time', name: '전체', active: timeframe === 'all_time' }
          ]
        },
        user_stats: {
          current_rank: 3,
          previous_rank: 5,
          rank_change: 2,
          points_to_next: 8,
          points_to_prev: 12,
          personal_best: 94,
          season_high: 96
        },
        achievements: [
          {
            id: 'top_10',
            name: 'Top 10 진입',
            description: '리더보드 상위 10위 달성',
            earned: true,
            earned_at: '2025-08-28'
          },
          {
            id: 'consistent_performer',
            name: '꾸준한 실력자',
            description: '일주일 연속 상위 20% 유지',
            earned: true,
            earned_at: '2025-08-25'
          },
          {
            id: 'rising_star',
            name: '라이징 스타',
            description: '한 주 동안 10계단 이상 상승',
            earned: false,
            progress: 67
          }
        ]
      };

      return res.status(200).json(leaderboardData);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Leaderboard operation failed',
      message: error.message 
    });
  }
};