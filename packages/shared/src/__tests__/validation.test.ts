// Golf Pro - Validation Tests

import { 
  validators, 
  golfValidators, 
  formValidators,
  validationUtils 
} from '../validation';

describe('validators', () => {
  describe('email', () => {
    it('should validate correct email format', () => {
      const result = validators.email('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', () => {
      const result = validators.email('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('올바른 이메일 주소를 입력해주세요');
    });

    it('should reject empty email', () => {
      const result = validators.email('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('이메일을 입력해주세요');
    });
  });

  describe('password', () => {
    it('should validate strong password', () => {
      const result = validators.password('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const result = validators.password('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require minimum length', () => {
      const result = validators.password('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('비밀번호는 최소 8자 이상이어야 합니다');
    });
  });

  describe('username', () => {
    it('should validate correct username', () => {
      const result = validators.username('golf_pro123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject username with invalid characters', () => {
      const result = validators.username('user@name');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('영문, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다');
    });

    it('should require minimum length', () => {
      const result = validators.username('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('confirmPassword', () => {
    it('should validate matching passwords', () => {
      const result = validators.confirmPassword('password123', 'password123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-matching passwords', () => {
      const result = validators.confirmPassword('password123', 'different456');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('비밀번호가 일치하지 않습니다');
    });
  });
});

describe('golfValidators', () => {
  describe('handicap', () => {
    it('should validate valid handicap', () => {
      const result = golfValidators.handicap(18);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject handicap outside valid range', () => {
      const result = golfValidators.handicap(60);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('score', () => {
    it('should validate valid golf score', () => {
      const result = golfValidators.score(85);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unrealistic scores', () => {
      const result = golfValidators.score(30);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('driveDistance', () => {
    it('should validate reasonable drive distance', () => {
      const result = golfValidators.driveDistance(250);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unrealistic distances', () => {
      const result = golfValidators.driveDistance(500);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('imageData', () => {
    it('should validate correct image data format', () => {
      const validImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
      const result = golfValidators.imageData(validImageData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid image format', () => {
      const result = golfValidators.imageData('invalid-image-data');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty image data', () => {
      const result = golfValidators.imageData('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('이미지를 선택해주세요');
    });
  });
});

describe('formValidators', () => {
  describe('loginForm', () => {
    it('should validate correct login data', () => {
      const result = formValidators.loginForm({
        email: 'user@example.com',
        password: 'password123'
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid login data', () => {
      const result = formValidators.loginForm({
        email: 'invalid-email',
        password: ''
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('registerForm', () => {
    it('should validate correct registration data', () => {
      const result = formValidators.registerForm({
        email: 'user@example.com',
        username: 'golfpro',
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!',
        name: 'Golf Pro'
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid registration data', () => {
      const result = formValidators.registerForm({
        email: 'invalid-email',
        username: 'ab',
        password: 'weak',
        confirmPassword: 'different',
        name: ''
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('profileForm', () => {
    it('should validate correct profile data', () => {
      const result = formValidators.profileForm({
        name: 'Golf Pro',
        handicap: 18,
        driveDistance: 250
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid profile data', () => {
      const result = formValidators.profileForm({
        name: '',
        handicap: 60,
        driveDistance: 600
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('validationUtils', () => {
  describe('combineResults', () => {
    it('should combine validation results correctly', () => {
      const result1 = { isValid: true, errors: [] };
      const result2 = { isValid: false, errors: ['Error 1'] };
      const result3 = { isValid: false, errors: ['Error 2'] };
      
      const combined = validationUtils.combineResults(result1, result2, result3);
      
      expect(combined.isValid).toBe(false);
      expect(combined.errors).toEqual(['Error 1', 'Error 2']);
    });
  });

  describe('getFirstError', () => {
    it('should return first error message', () => {
      const result = { isValid: false, errors: ['First error', 'Second error'] };
      expect(validationUtils.getFirstError(result)).toBe('First error');
    });

    it('should return null for valid result', () => {
      const result = { isValid: true, errors: [] };
      expect(validationUtils.getFirstError(result)).toBe(null);
    });
  });

  describe('hasErrors', () => {
    it('should detect errors in results', () => {
      const result1 = { isValid: true, errors: [] };
      const result2 = { isValid: false, errors: ['Error'] };
      
      expect(validationUtils.hasErrors(result1)).toBe(false);
      expect(validationUtils.hasErrors(result1, result2)).toBe(true);
    });
  });

  describe('createError and createSuccess', () => {
    it('should create error result', () => {
      const result = validationUtils.createError('Test error');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Test error']);
    });

    it('should create success result', () => {
      const result = validationUtils.createSuccess();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});