// Golf Pro API - Utility Tests

const path = require('path');

// Mock utility functions for testing
const analyzeSwing = (imageData) => {
  if (!imageData) {
    throw new Error('Image data is required');
  }
  
  return {
    score: Math.floor(Math.random() * 40) + 60, // 60-100
    feedback: ['스윙 분석 완료'],
    pose: {
      shoulderRotation: Math.floor(Math.random() * 180),
      hipRotation: Math.floor(Math.random() * 90),
      xFactor: Math.floor(Math.random() * 60),
      spineAngle: Math.floor(Math.random() * 30) - 15
    }
  };
};

const validateBase64Image = (imageData) => {
  if (!imageData || typeof imageData !== 'string') {
    return { valid: false, error: '이미지 데이터가 필요합니다' };
  }
  
  const base64Pattern = /^data:image\/(jpeg|png|jpg|gif);base64,/;
  if (!base64Pattern.test(imageData)) {
    return { valid: false, error: '유효한 이미지 형식이 아닙니다' };
  }
  
  const base64Data = imageData.split(',')[1];
  const estimatedSize = (base64Data.length * 3) / 4;
  
  if (estimatedSize > 10 * 1024 * 1024) {
    return { valid: false, error: '파일 크기가 너무 큽니다' };
  }
  
  return { valid: true, size: estimatedSize };
};

const calculateXFactor = (shoulderRotation, hipRotation) => {
  return Math.abs(shoulderRotation - hipRotation);
};

const generateSwingFeedback = (pose) => {
  const feedback = [];
  
  if (pose.shoulderRotation < 80) {
    feedback.push('어깨 회전을 더 크게 해보세요');
  }
  
  if (pose.xFactor < 20) {
    feedback.push('X-Factor를 늘려 파워를 증가시키세요');
  }
  
  if (Math.abs(pose.spineAngle) > 15) {
    feedback.push('척추 각도를 유지하세요');
  }
  
  if (feedback.length === 0) {
    feedback.push('훌륭한 스윙입니다!');
  }
  
  return feedback;
};

describe('Swing Analysis Utils', () => {
  describe('analyzeSwing', () => {
    it('should analyze swing with valid image data', () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...';
      const result = analyzeSwing(imageData);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('pose');
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.feedback)).toBe(true);
    });
    
    it('should throw error for missing image data', () => {
      expect(() => {
        analyzeSwing();
      }).toThrow('Image data is required');
      
      expect(() => {
        analyzeSwing(null);
      }).toThrow('Image data is required');
    });
  });
  
  describe('validateBase64Image', () => {
    it('should validate correct base64 image format', () => {
      const validImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
      
      const result = validateBase64Image(validImage);
      expect(result.valid).toBe(true);
      expect(result.size).toBeDefined();
    });
    
    it('should reject invalid image format', () => {
      const invalidImage = 'invalid-image-data';
      
      const result = validateBase64Image(invalidImage);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('유효한 이미지 형식이 아닙니다');
    });
    
    it('should reject empty image data', () => {
      const result = validateBase64Image('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('이미지 데이터가 필요합니다');
    });
    
    it('should reject null or undefined', () => {
      expect(validateBase64Image(null).valid).toBe(false);
      expect(validateBase64Image(undefined).valid).toBe(false);
    });
  });
});

describe('Golf Calculation Utils', () => {
  describe('calculateXFactor', () => {
    it('should calculate X-Factor correctly', () => {
      expect(calculateXFactor(90, 45)).toBe(45);
      expect(calculateXFactor(80, 50)).toBe(30);
      expect(calculateXFactor(60, 80)).toBe(20);
    });
    
    it('should handle negative values', () => {
      expect(calculateXFactor(-10, 10)).toBe(20);
      expect(calculateXFactor(10, -10)).toBe(20);
    });
    
    it('should return 0 for equal rotations', () => {
      expect(calculateXFactor(45, 45)).toBe(0);
      expect(calculateXFactor(0, 0)).toBe(0);
    });
  });
  
  describe('generateSwingFeedback', () => {
    it('should generate positive feedback for good form', () => {
      const goodPose = {
        shoulderRotation: 90,
        xFactor: 35,
        spineAngle: 5
      };
      
      const feedback = generateSwingFeedback(goodPose);
      expect(feedback).toContain('훌륭한 스윙입니다!');
    });
    
    it('should suggest improvements for poor shoulder rotation', () => {
      const poorPose = {
        shoulderRotation: 60,
        xFactor: 25,
        spineAngle: 5
      };
      
      const feedback = generateSwingFeedback(poorPose);
      expect(feedback.some(f => f.includes('어깨 회전'))).toBe(true);
    });
    
    it('should suggest X-Factor improvement', () => {
      const poorPose = {
        shoulderRotation: 90,
        xFactor: 10,
        spineAngle: 5
      };
      
      const feedback = generateSwingFeedback(poorPose);
      expect(feedback.some(f => f.includes('X-Factor'))).toBe(true);
    });
    
    it('should suggest spine angle correction', () => {
      const poorPose = {
        shoulderRotation: 90,
        xFactor: 35,
        spineAngle: 20
      };
      
      const feedback = generateSwingFeedback(poorPose);
      expect(feedback.some(f => f.includes('척추 각도'))).toBe(true);
    });
    
    it('should provide multiple suggestions for poor form', () => {
      const terriblePose = {
        shoulderRotation: 50,
        xFactor: 10,
        spineAngle: 25
      };
      
      const feedback = generateSwingFeedback(terriblePose);
      expect(feedback.length).toBeGreaterThan(1);
    });
  });
});

describe('Error Handling Utils', () => {
  it('should handle network timeouts gracefully', async () => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 100);
    });
    
    try {
      await timeoutPromise;
    } catch (error) {
      expect(error.message).toBe('Timeout');
    }
  });
  
  it('should sanitize user input', () => {
    const sanitizeInput = (input) => {
      if (typeof input !== 'string') return '';
      return input.replace(/<script[^>]*>.*?<\/script>/gi, '');
    };
    
    const maliciousInput = '<script>alert("xss")</script>Hello';
    const sanitized = sanitizeInput(maliciousInput);
    expect(sanitized).toBe('Hello');
    expect(sanitized).not.toContain('<script>');
  });
});

describe('Performance Utils', () => {
  it('should measure execution time', () => {
    const measureTime = (fn) => {
      const start = Date.now();
      fn();
      return Date.now() - start;
    };
    
    const slowFunction = () => {
      for (let i = 0; i < 100000; i++) {
        Math.sqrt(i);
      }
    };
    
    const time = measureTime(slowFunction);
    expect(time).toBeGreaterThan(0);
  });
  
  it('should cache expensive calculations', () => {
    const cache = new Map();
    
    const expensiveCalculation = (n) => {
      if (cache.has(n)) {
        return cache.get(n);
      }
      
      let result = 0;
      for (let i = 0; i <= n; i++) {
        result += Math.sqrt(i);
      }
      
      cache.set(n, result);
      return result;
    };
    
    const result1 = expensiveCalculation(1000);
    const result2 = expensiveCalculation(1000); // Should hit cache
    
    expect(result1).toBe(result2);
    expect(cache.has(1000)).toBe(true);
  });
});