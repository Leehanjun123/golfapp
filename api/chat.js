// Vercel Serverless Function - Chat
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
      // 채팅방 목록 또는 채팅 기록 조회
      const url = new URL(req.url, `http://${req.headers.host}`);
      const room_id = url.searchParams.get('room_id');

      if (room_id) {
        // 특정 채팅방의 메시지 기록
        const chatHistory = {
          success: true,
          room_id,
          messages: [
            {
              id: 'msg_1',
              user_id: 'ai_coach',
              username: 'AI 골프 코치',
              message: '안녕하세요! 오늘 연습은 어떠셨나요?',
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              type: 'text',
              is_ai: true
            },
            {
              id: 'msg_2',
              user_id: 'current_user',
              username: 'Golf User',
              message: '백스윙에서 자꾸 균형을 잃는 것 같아요',
              timestamp: new Date(Date.now() - 7000000).toISOString(),
              type: 'text',
              is_ai: false
            },
            {
              id: 'msg_3',
              user_id: 'ai_coach',
              username: 'AI 골프 코치',
              message: '백스윙 시 체중이 오른발에 완전히 이동하지 않고 있을 가능성이 높습니다. 어드레스에서 체중을 발가락 쪽에 두고 연습해보세요.',
              timestamp: new Date(Date.now() - 6900000).toISOString(),
              type: 'text',
              is_ai: true,
              attachments: [
                {
                  type: 'tip',
                  title: '백스윙 균형 드릴',
                  description: '한 발로 서서 스윙하는 연습'
                }
              ]
            },
            {
              id: 'msg_4',
              user_id: 'friend_user',
              username: 'ProGolfer123',
              message: '저도 초보 때 같은 문제가 있었어요! 연습장에서 같이 해봐요',
              timestamp: new Date(Date.now() - 6800000).toISOString(),
              type: 'text',
              is_ai: false
            }
          ],
          participants: [
            { id: 'current_user', username: 'Golf User', status: 'online' },
            { id: 'ai_coach', username: 'AI 골프 코치', status: 'online' },
            { id: 'friend_user', username: 'ProGolfer123', status: 'away' }
          ]
        };

        return res.status(200).json(chatHistory);
      }

      // 채팅방 목록
      const chatRooms = {
        success: true,
        rooms: [
          {
            id: 'room_ai_coach',
            name: 'AI 골프 코치',
            type: 'ai_chat',
            participants_count: 2,
            last_message: {
              text: '오늘도 좋은 연습 되세요!',
              timestamp: new Date(Date.now() - 1800000).toISOString(),
              sender: 'AI 골프 코치'
            },
            unread_count: 0,
            is_active: true
          },
          {
            id: 'room_golf_buddies',
            name: '골프 동호회',
            type: 'group_chat',
            participants_count: 8,
            last_message: {
              text: '이번 주말 라운딩 어때요?',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              sender: 'ProGolfer123'
            },
            unread_count: 3,
            is_active: true
          },
          {
            id: 'room_beginner_tips',
            name: '초보자 팁 공유',
            type: 'topic_chat',
            participants_count: 24,
            last_message: {
              text: '그립 잡는 법 영상 공유드려요',
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              sender: 'GolfMaster'
            },
            unread_count: 1,
            is_active: true
          }
        ]
      };

      return res.status(200).json(chatRooms);
    }

    if (req.method === 'POST') {
      const { room_id, message, type = 'text' } = req.body || {};

      if (!room_id || !message) {
        return res.status(400).json({
          success: false,
          error: 'Room ID and message are required'
        });
      }

      // 메시지 전송 처리
      const sentMessage = {
        success: true,
        message: {
          id: `msg_${Date.now()}`,
          room_id,
          user_id: 'current_user',
          username: 'Golf User',
          message,
          type,
          timestamp: new Date().toISOString(),
          is_ai: false,
          status: 'sent'
        }
      };

      // AI 코치 자동 응답 (AI 채팅방인 경우)
      if (room_id === 'room_ai_coach') {
        const aiResponses = {
          '스윙': 'recent에서 분석한 결과를 보면 스윙이 많이 개선되었네요! 특히 어떤 부분이 궁금하신가요?',
          '자세': '자세 교정에 대해 문의하셨네요. 현재 어드레스 자세에서 가장 신경 쓰이는 부분이 무엇인가요?',
          '연습': '꾸준한 연습이 가장 중요합니다. 하루 30분씩이라도 규칙적으로 하시는 것을 추천드려요.',
          '도움': '언제든 도움이 필요하시면 말씀해주세요! 스윙 분석, 자세 교정, 연습 방법 등 무엇이든 물어보세요.',
          'default': '좋은 질문이네요! 더 구체적으로 설명해주시면 더 도움이 될 답변을 드릴 수 있어요.'
        };

        let aiResponse = aiResponses.default;
        for (const [keyword, response] of Object.entries(aiResponses)) {
          if (keyword !== 'default' && message.includes(keyword)) {
            aiResponse = response;
            break;
          }
        }

        sentMessage.ai_response = {
          id: `msg_ai_${Date.now()}`,
          user_id: 'ai_coach',
          username: 'AI 골프 코치',
          message: aiResponse,
          timestamp: new Date(Date.now() + 2000).toISOString(),
          type: 'text',
          is_ai: true
        };
      }

      return res.status(200).json(sentMessage);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Chat operation failed',
      message: error.message 
    });
  }
};