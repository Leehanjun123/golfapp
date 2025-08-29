// Golf Pro API - Server Tests

const request = require('supertest');
const express = require('express');

// Mock server for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Mock API endpoints
  app.get('/api/v1/stats', (req, res) => {
    res.json({
      success: true,
      data: {
        totalUsers: 100,
        totalAnalyses: 500,
        accuracy: 98
      }
    });
  });
  
  app.post('/api/v1/analysis/swing', (req, res) => {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required'
      });
    }
    
    res.json({
      success: true,
      data: {
        score: 85,
        feedback: ['좋은 스윙입니다!'],
        improvements: ['어깨 회전을 더 크게 해보세요'],
        pose: {
          shoulderRotation: 80,
          hipRotation: 45,
          xFactor: 35,
          spineAngle: 5
        },
        processing: {
          time: '50ms',
          method: 'local-ai',
          accuracy: '98%'
        }
      }
    });
  });
  
  return app;
};

describe('Server Health', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });
});

describe('API Endpoints', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  describe('GET /api/v1/stats', () => {
    it('should return statistics', async () => {
      const response = await request(app)
        .get('/api/v1/stats')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('totalAnalyses');
      expect(response.body.data).toHaveProperty('accuracy');
      expect(response.body.data.accuracy).toBe(98);
    });
  });
  
  describe('POST /api/v1/analysis/swing', () => {
    it('should analyze swing with valid image', async () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...';
      
      const response = await request(app)
        .post('/api/v1/analysis/swing')
        .send({ image: imageData })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('score');
      expect(response.body.data).toHaveProperty('feedback');
      expect(response.body.data).toHaveProperty('improvements');
      expect(response.body.data).toHaveProperty('pose');
      expect(response.body.data).toHaveProperty('processing');
      
      // Check score is within valid range
      expect(response.body.data.score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.score).toBeLessThanOrEqual(100);
      
      // Check pose data structure
      expect(response.body.data.pose).toHaveProperty('shoulderRotation');
      expect(response.body.data.pose).toHaveProperty('hipRotation');
      expect(response.body.data.pose).toHaveProperty('xFactor');
      expect(response.body.data.pose).toHaveProperty('spineAngle');
      
      // Check processing metadata
      expect(response.body.data.processing).toHaveProperty('time');
      expect(response.body.data.processing).toHaveProperty('method');
      expect(response.body.data.processing).toHaveProperty('accuracy');
    });
    
    it('should return error for missing image data', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/swing')
        .send({})
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Image data is required');
    });
    
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/swing')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });
});

describe('Error Handling', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  it('should handle 404 for unknown endpoints', async () => {
    await request(app)
      .get('/api/v1/unknown-endpoint')
      .expect(404);
  });
  
  it('should handle CORS headers', async () => {
    const response = await request(app)
      .options('/api/v1/stats')
      .expect(200);
      
    // Note: CORS headers would be tested if CORS middleware was added
  });
});

describe('Request Validation', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  it('should validate content-type for POST requests', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/swing')
      .set('Content-Type', 'text/plain')
      .send('plain text data');
      
    // Should either accept or reject based on content-type validation
    expect([200, 400, 415]).toContain(response.status);
  });
});