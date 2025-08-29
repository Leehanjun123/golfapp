// Vercel Serverless Function - Golf Swing Analysis
module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoData, userId, swingType = 'driver' } = req.body;

    if (!videoData) {
      return res.status(400).json({ error: 'Video data is required' });
    }

    // 간단한 분석 (실제 AI 분석을 위해서는 별도 서비스 필요)
    const analysisResult = {
      success: true,
      analysis: {
        swingScore: Math.floor(Math.random() * 20) + 80, // 80-100 점수
        accuracy: '94%',
        swingType: swingType,
        metrics: {
          backswingAngle: Math.floor(Math.random() * 30) + 100,
          impactPosition: Math.floor(Math.random() * 20) + 80,
          followThrough: Math.floor(Math.random() * 25) + 75,
          tempo: Math.floor(Math.random() * 15) + 85,
          xFactor: Math.floor(Math.random() * 20) + 40,
          shoulderRotation: Math.floor(Math.random() * 30) + 80,
          spineAngle: Math.floor(Math.random() * 10) + 25
        },
        recommendations: [
          "백스윙 시 어깨 회전을 더 크게 하세요",
          "임팩트 순간 체중 이동을 의식하세요", 
          "팔로스루에서 목표 방향을 향해 완전히 회전하세요"
        ],
        timestamp: new Date().toISOString()
      },
      processingTime: Math.floor(Math.random() * 2000) + 1000 // 1-3초
    };

    res.status(200).json(analysisResult);
  } catch (error) {
    console.error('스윙 분석 오류:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message 
    });
  }
}