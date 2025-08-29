// Vercel Serverless Function - Authentication
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'golf-ai-vercel-secret-2025';

// 간단한 메모리 사용자 저장소 (실제로는 데이터베이스 사용)
let users = [
  {
    id: 1,
    email: 'test@golf.com',
    password: '$2a$10$test.hash.for.demo', // 'password123'
    name: 'Golf User',
    createdAt: new Date().toISOString()
  }
];

module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `https://${req.headers.host}`);

  try {
    if (pathname.endsWith('/login') && req.method === 'POST') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // 간단한 로그인 (실제로는 데이터베이스와 비교)
      if (email === 'test@golf.com' && password === 'password123') {
        const token = jwt.sign(
          { userId: 1, email: email },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.status(200).json({
          success: true,
          token,
          user: {
            id: 1,
            email: email,
            name: 'Golf User'
          }
        });
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    if (pathname.endsWith('/register') && req.method === 'POST') {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'All fields required' });
      }

      // 간단한 회원가입
      const newUser = {
        id: users.length + 1,
        email,
        name,
        password: await bcrypt.hash(password, 10),
        createdAt: new Date().toISOString()
      };

      users.push(newUser);

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name
        }
      });
    }

    if (pathname.endsWith('/verify') && req.method === 'GET') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return res.status(200).json({
          success: true,
          user: {
            id: decoded.userId,
            email: decoded.email
          }
        });
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}