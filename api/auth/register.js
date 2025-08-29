// Vercel Serverless Function - Register
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
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields required (email, password, name)' 
      });
    }

    // 간단한 회원가입 시뮬레이션
    const newUser = {
      id: Math.floor(Math.random() * 10000),
      email,
      name,
      profileImage: null,
      handicap: 20,
      joinDate: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new.token',
      user: newUser,
      message: 'Registration successful'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Registration failed',
      message: error.message 
    });
  }
};