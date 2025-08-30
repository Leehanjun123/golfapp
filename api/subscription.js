// Vercel Serverless Function - Subscription
module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const subscriptionInfo = {
        success: true,
        current_subscription: {
          id: 'sub_premium_123',
          plan: 'premium',
          status: 'active',
          start_date: '2025-08-01',
          end_date: '2025-11-01',
          auto_renew: true,
          payment_method: 'credit_card',
          next_billing_date: '2025-11-01',
          amount: 29.99,
          currency: 'USD'
        },
        
        available_plans: [
          {
            id: 'free',
            name: '기본 플랜',
            price: 0,
            currency: 'USD',
            billing_period: 'monthly',
            features: [
              '기본 스윙 분석 (월 10회)',
              '기본 AI 코치 조언',
              '진행 상황 추적',
              '커뮤니티 접근'
            ],
            limitations: [
              '고급 분석 불가',
              '비디오 분석 불가',
              '프로 비교 불가'
            ]
          },
          {
            id: 'premium',
            name: '프리미엄',
            price: 29.99,
            currency: 'USD', 
            billing_period: 'monthly',
            features: [
              '무제한 스윙 분석',
              '고급 AI 코치 (개인화)',
              '비디오 분석',
              '프로 골퍼 비교',
              '상세 통계 및 리포트',
              '우선 고객지원'
            ],
            popular: true
          },
          {
            id: 'pro',
            name: '프로 플랜',
            price: 59.99,
            currency: 'USD',
            billing_period: 'monthly',
            features: [
              '프리미엄 플랜의 모든 기능',
              '실시간 스윙 코칭',
              '1:1 전문가 세션 (월 2회)',
              '맞춤형 훈련 프로그램',
              '고급 바이오메카닉 분석',
              '우선 베타 기능 접근'
            ]
          }
        ],

        usage_stats: {
          current_month: {
            swing_analyses: 47,
            video_analyses: 12,
            ai_interactions: 89,
            limit_reached: false
          },
          remaining_quota: {
            swing_analyses: 'unlimited',
            video_analyses: 'unlimited',
            ai_interactions: 'unlimited'
          }
        },

        billing_history: [
          {
            date: '2025-08-01',
            amount: 29.99,
            status: 'paid',
            invoice_id: 'inv_001'
          },
          {
            date: '2025-07-01', 
            amount: 29.99,
            status: 'paid',
            invoice_id: 'inv_002'
          }
        ]
      };

      return res.status(200).json(subscriptionInfo);
    }

    if (req.method === 'POST') {
      const { action, plan_id } = req.body || {};

      if (action === 'subscribe') {
        return res.status(200).json({
          success: true,
          message: '구독이 성공적으로 시작되었습니다!',
          subscription: {
            id: `sub_${plan_id}_${Date.now()}`,
            plan: plan_id,
            status: 'active',
            start_date: new Date().toISOString(),
            payment_status: 'completed'
          }
        });
      }

      if (action === 'cancel') {
        return res.status(200).json({
          success: true,
          message: '구독이 취소되었습니다. 현재 기간 종료까지 서비스를 이용할 수 있습니다.',
          cancellation: {
            cancelled_at: new Date().toISOString(),
            end_date: '2025-11-01',
            refund_amount: 0
          }
        });
      }

      if (action === 'update_payment') {
        const { payment_method } = req.body;
        return res.status(200).json({
          success: true,
          message: '결제 방법이 업데이트되었습니다.',
          payment_method: payment_method || 'credit_card',
          updated_at: new Date().toISOString()
        });
      }

      return res.status(400).json({ 
        success: false, 
        error: 'Invalid action' 
      });
    }

    if (req.method === 'PUT') {
      const { plan_id, auto_renew } = req.body || {};
      
      return res.status(200).json({
        success: true,
        message: '구독 설정이 업데이트되었습니다.',
        updated_settings: {
          plan: plan_id || 'premium',
          auto_renew: auto_renew !== undefined ? auto_renew : true,
          updated_at: new Date().toISOString()
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Subscription operation failed',
      message: error.message 
    });
  }
};