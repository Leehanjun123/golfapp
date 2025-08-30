// Vercel Serverless Function - Social Features (Friends + Leaderboard + Chat)
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
    const feature = url.searchParams.get('feature') || 'friends';

    // Friends functionality
    if (feature === 'friends') {
      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          friends: [
            {
              id: 'friend_1',
              username: 'ProGolfer123',
              display_name: '골프 마스터',
              level: 'expert',
              current_score: 89,
              status: 'online'
            }
          ]
        });
      }
      
      if (req.method === 'POST') {
        const { action } = req.body || {};
        return res.status(200).json({
          success: true,
          message: action === 'send_request' ? '친구 요청을 보냈습니다!' : '완료되었습니다!'
        });
      }
    }

    // Leaderboard functionality  
    if (feature === 'leaderboard') {
      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          leaderboard: {
            rankings: [
              {
                rank: 1,
                username: 'Tiger Pro',
                score: 95,
                level: 'Pro'
              },
              {
                rank: 2,
                username: 'Eagle Master',
                score: 92,
                level: 'Expert'
              },
              {
                rank: 3,
                username: 'Golf User',
                score: 89,
                level: 'Advanced',
                is_current_user: true
              }
            ]
          }
        });
      }
    }

    // Chat functionality
    if (feature === 'chat') {
      if (req.method === 'GET') {
        const room_id = url.searchParams.get('room_id');
        
        if (room_id) {
          return res.status(200).json({
            success: true,
            messages: [
              {
                id: 'msg_1',
                user_id: 'ai_coach',
                username: 'AI 골프 코치',
                message: '안녕하세요! 오늘 연습은 어떠셨나요?',
                timestamp: new Date().toISOString(),
                is_ai: true
              }
            ]
          });
        }

        return res.status(200).json({
          success: true,
          rooms: [
            {
              id: 'room_ai_coach',
              name: 'AI 골프 코치',
              type: 'ai_chat',
              unread_count: 0
            }
          ]
        });
      }

      if (req.method === 'POST') {
        const { message } = req.body || {};
        return res.status(200).json({
          success: true,
          message: {
            id: `msg_${Date.now()}`,
            message,
            timestamp: new Date().toISOString(),
            status: 'sent'
          }
        });
      }
    }

    return res.status(400).json({ error: 'Invalid feature parameter' });
    
  } catch (error) {
    console.error('Social features error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Social features operation failed',
      message: error.message 
    });
  }
};