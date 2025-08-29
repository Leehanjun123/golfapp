// Vercel Serverless Function - User Profile
module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: 프로필 조회
    if (req.method === 'GET') {
      const mockProfile = {
        success: true,
        user: {
          id: 1,
          name: 'Golf User',
          email: 'test@golf.com',
          profileImage: null,
          handicap: 18,
          joinDate: '2025-08-29T00:00:00.000Z',
          stats: {
            totalSwings: 245,
            averageScore: 85.4,
            bestScore: 78,
            improvementRate: 12.5,
            lastPlayDate: new Date().toISOString()
          },
          achievements: [
            { id: 1, name: '첫 스윙', description: '첫 번째 스윙 분석 완료', earned: true },
            { id: 2, name: '꾸준함', description: '7일 연속 연습', earned: false },
            { id: 3, name: '정확도 왕', description: '스윙 정확도 90% 이상', earned: true }
          ]
        }
      };

      return res.status(200).json(mockProfile);
    }

    // PUT: 프로필 업데이트
    if (req.method === 'PUT') {
      const { name, handicap, profileImage } = req.body || {};

      const updatedProfile = {
        success: true,
        user: {
          id: 1,
          name: name || 'Golf User',
          email: 'test@golf.com',
          profileImage: profileImage || null,
          handicap: handicap || 18,
          joinDate: '2025-08-29T00:00:00.000Z',
          updatedAt: new Date().toISOString()
        },
        message: 'Profile updated successfully'
      };

      return res.status(200).json(updatedProfile);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Profile operation failed',
      message: error.message 
    });
  }
};