// Vercel Serverless Function - Friends
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
      const friendsData = {
        success: true,
        friends: [
          {
            id: 'friend_1',
            username: 'ProGolfer123',
            display_name: '골프 마스터',
            avatar: '🏌️‍♂️',
            level: 'expert',
            current_score: 89,
            handicap: 12,
            status: 'online',
            last_played: new Date(Date.now() - 3600000).toISOString(),
            friendship_since: '2025-07-15',
            mutual_friends: 3,
            recent_achievement: '일주일 연속 연습 달성'
          },
          {
            id: 'friend_2',
            username: 'EagleHunter',
            display_name: '이글 헌터',
            avatar: '🦅',
            level: 'advanced',
            current_score: 85,
            handicap: 15,
            status: 'playing',
            last_played: new Date(Date.now() - 1800000).toISOString(),
            friendship_since: '2025-08-01',
            mutual_friends: 7,
            recent_achievement: 'Top 10 리더보드 진입'
          },
          {
            id: 'friend_3',
            username: 'SwingKing',
            display_name: '스윙킹',
            avatar: '👑',
            level: 'intermediate',
            current_score: 78,
            handicap: 18,
            status: 'offline',
            last_played: new Date(Date.now() - 86400000).toISOString(),
            friendship_since: '2025-06-20',
            mutual_friends: 2,
            recent_achievement: '정확도 90% 달성'
          }
        ],
        friend_requests: [
          {
            id: 'request_1',
            from_user: {
              id: 'user_123',
              username: 'NewPlayer',
              display_name: '신입 플레이어',
              avatar: '⭐',
              level: 'beginner'
            },
            message: '같이 연습하고 싶어요!',
            sent_at: new Date(Date.now() - 259200000).toISOString()
          }
        ],
        suggested_friends: [
          {
            id: 'suggestion_1',
            username: 'LocalPro',
            display_name: '동네 프로',
            avatar: '🏆',
            level: 'pro',
            mutual_friends: 5,
            similar_skill: 92,
            reason: '비슷한 실력과 연습 시간대를 가지고 있습니다'
          }
        ],
        stats: {
          total_friends: 15,
          active_friends: 8,
          pending_requests: 1,
          friends_online: 2
        }
      };

      return res.status(200).json(friendsData);
    }

    if (req.method === 'POST') {
      const { action, target_user_id, message } = req.body || {};

      if (action === 'send_request') {
        return res.status(200).json({
          success: true,
          message: '친구 요청을 보냈습니다!',
          request_id: `request_${Date.now()}`,
          sent_at: new Date().toISOString()
        });
      }

      if (action === 'accept_request') {
        return res.status(200).json({
          success: true,
          message: '친구 요청을 수락했습니다!',
          friend_id: target_user_id,
          friendship_started: new Date().toISOString()
        });
      }

      if (action === 'challenge_friend') {
        const { challenge_type, target_score } = req.body;
        return res.status(200).json({
          success: true,
          message: '친구에게 챌린지를 보냈습니다!',
          challenge: {
            id: `challenge_${Date.now()}`,
            type: challenge_type || 'score_battle',
            target_score: target_score || 90,
            expires_at: new Date(Date.now() + 86400000).toISOString()
          }
        });
      }

      return res.status(400).json({ 
        success: false, 
        error: 'Invalid action' 
      });
    }

    if (req.method === 'DELETE') {
      const { friend_id } = req.body || {};
      
      return res.status(200).json({
        success: true,
        message: '친구가 삭제되었습니다.',
        removed_friend_id: friend_id,
        removed_at: new Date().toISOString()
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Friends error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Friends operation failed',
      message: error.message 
    });
  }
};