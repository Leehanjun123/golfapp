// Vercel Serverless Function - AI Coach Chat
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
      // AI 코치 상태 정보
      return res.status(200).json({
        success: true,
        coach_info: {
          name: '프로 골프 AI 코치',
          specialties: ['스윙 분석', '자세 교정', '멘탈 코칭', '전략 수립'],
          experience: '10,000+ 골프 스윙 분석',
          availability: 'online',
          response_time: '실시간'
        }
      });
    }

    if (req.method === 'POST') {
      const { message, user_data, conversation_history } = req.body || {};

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // AI 코치 응답 생성
      const responses = {
        '스윙': '스윙에서 가장 중요한 것은 일관성입니다. 백스윙 시 어깨 회전을 충분히 하고, 다운스윙에서는 하체부터 시작하세요. 현재 분석 결과를 보면 백스윙 각도가 좋으니 이 감각을 유지하세요!',
        '자세': '올바른 어드레스 자세가 좋은 스윙의 기초입니다. 발 너비는 어깨 너비 정도로, 무게 중심은 발가락 쪽에 두세요. 척추는 곧게 펴고 약간 전방으로 기울이는 것이 좋습니다.',
        '그립': '그립은 너무 세게 잡으면 안 됩니다. 새끼 새를 잡듯 부드럽게 잡으세요. 왼손 엄지는 클럽 샤프트 오른쪽에, 오른손은 왼손을 감싸듯 잡으면 됩니다.',
        '연습': '효과적인 연습을 위해서는 목표를 정하고 집중적으로 연습하세요. 매일 30분씩 꾸준히 하는 것이 하루에 3시간 한 번 하는 것보다 효과적입니다.',
        '멘탈': '골프는 멘탈 스포츠입니다. 실수했을 때 너무 자책하지 마시고, 다음 샷에 집중하세요. 깊게 숨을 들이마시고 루틴을 지키는 것이 중요합니다.',
        'default': '좋은 질문이네요! 골프 실력 향상을 위해서는 기본기가 가장 중요합니다. 스윙 분석 결과를 바탕으로 개인 맞춤 조언을 드릴 수 있으니, 구체적인 질문을 해보세요.'
      };

      // 키워드 기반 응답 선택
      let response = responses.default;
      for (const [keyword, reply] of Object.entries(responses)) {
        if (keyword !== 'default' && message.includes(keyword)) {
          response = reply;
          break;
        }
      }

      // 사용자 데이터 기반 개인화
      if (user_data) {
        if (user_data.recent_score < 70) {
          response += '\n\n최근 분석 점수가 낮으니 기본기부터 차근차근 연습하세요.';
        } else if (user_data.recent_score > 85) {
          response += '\n\n실력이 상당하시네요! 더 세밀한 기술 향상에 집중해보세요.';
        }
      }

      const chatResponse = {
        success: true,
        response: {
          message: response,
          coach_name: 'AI 프로 코치',
          timestamp: new Date().toISOString(),
          suggestions: [
            '스윙 자세 체크하기',
            '개인 맞춤 연습 계획 받기',
            '약점 분석 요청하기'
          ],
          follow_up_questions: [
            '어떤 부분을 더 개선하고 싶으신가요?',
            '연습 시간은 얼마나 할 수 있나요?',
            '가장 어려워하는 상황이 무엇인가요?'
          ]
        }
      };

      return res.status(200).json(chatResponse);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('AI Coach chat error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'AI Coach chat failed',
      message: error.message 
    });
  }
};