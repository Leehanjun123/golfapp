// Vercel Serverless Function - Login
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
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password required' 
      });
    }

    // 간단한 테스트 로그인
    if (email === 'test@golf.com' && password === 'password123') {
      return res.status(200).json({
        success: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
        user: {
          id: 1,
          email: email,
          name: 'Golf User',
          profileImage: null,
          handicap: 18,
          joinDate: new Date().toISOString()
        }
      });
    }

    return res.status(401).json({ 
      success: false,
      error: 'Invalid credentials' 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Login failed',
      message: error.message 
    });
  }
};