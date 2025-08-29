const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/env');

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = config.JWT_EXPIRES_IN;

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Hash password
const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

// Compare password
const comparePassword = (password, hashedPassword) => {
  return bcrypt.compareSync(password, hashedPassword);
};

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '인증 토큰이 필요합니다'
    });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: '유효하지 않은 토큰입니다'
    });
  }
  
  req.userId = decoded.userId;
  next();
};

// Optional authentication middleware (for endpoints that work with or without auth)
const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      req.userId = decoded.userId;
    }
  }
  
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authMiddleware,
  optionalAuthMiddleware
};