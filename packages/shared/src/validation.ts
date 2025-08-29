// Golf Pro - Validation Utilities

import { VALIDATION, ERROR_MESSAGES } from './constants';

// ===========================================
// Validation Result Type
// ===========================================
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ===========================================
// Basic Validators
// ===========================================
export const validators = {
  /**
   * Validate email format
   */
  email: (email: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('이메일을 입력해주세요');
    } else if (!VALIDATION.EMAIL_REGEX.test(email)) {
      errors.push(ERROR_MESSAGES.EMAIL_INVALID);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate password strength
   */
  password: (password: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('비밀번호를 입력해주세요');
    } else {
      if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
        errors.push(ERROR_MESSAGES.PASSWORD_TOO_SHORT);
      }
      
      if (!/(?=.*[a-z])/.test(password)) {
        errors.push('소문자를 최소 1개 포함해야 합니다');
      }
      
      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('대문자를 최소 1개 포함해야 합니다');
      }
      
      if (!/(?=.*\d)/.test(password)) {
        errors.push('숫자를 최소 1개 포함해야 합니다');
      }
      
      if (!/(?=.*[@$!%*?&])/.test(password)) {
        errors.push('특수문자를 최소 1개 포함해야 합니다');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate password confirmation
   */
  confirmPassword: (password: string, confirmPassword: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!confirmPassword) {
      errors.push('비밀번호 확인을 입력해주세요');
    } else if (password !== confirmPassword) {
      errors.push(ERROR_MESSAGES.PASSWORDS_NOT_MATCH);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate username
   */
  username: (username: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!username) {
      errors.push(ERROR_MESSAGES.USERNAME_REQUIRED);
    } else {
      if (username.length < VALIDATION.USERNAME_MIN_LENGTH) {
        errors.push(`사용자명은 최소 ${VALIDATION.USERNAME_MIN_LENGTH}자 이상이어야 합니다`);
      }
      
      if (username.length > VALIDATION.USERNAME_MAX_LENGTH) {
        errors.push(`사용자명은 최대 ${VALIDATION.USERNAME_MAX_LENGTH}자까지 가능합니다`);
      }
      
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push('영문, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate required field
   */
  required: (value: any, fieldName: string): ValidationResult => {
    const errors: string[] = [];
    
    if (value === undefined || value === null || value === '') {
      errors.push(`${fieldName}을(를) 입력해주세요`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate number range
   */
  numberRange: (value: number, min: number, max: number, fieldName: string): ValidationResult => {
    const errors: string[] = [];
    
    if (isNaN(value)) {
      errors.push(`${fieldName}는 숫자여야 합니다`);
    } else {
      if (value < min) {
        errors.push(`${fieldName}는 최소 ${min} 이상이어야 합니다`);
      }
      if (value > max) {
        errors.push(`${fieldName}는 최대 ${max} 이하여야 합니다`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate string length
   */
  stringLength: (value: string, min: number, max: number, fieldName: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!value) {
      errors.push(`${fieldName}을(를) 입력해주세요`);
    } else {
      if (value.length < min) {
        errors.push(`${fieldName}는 최소 ${min}자 이상이어야 합니다`);
      }
      if (value.length > max) {
        errors.push(`${fieldName}는 최대 ${max}자까지 가능합니다`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// ===========================================
// Golf-Specific Validators
// ===========================================
export const golfValidators = {
  /**
   * Validate handicap value
   */
  handicap: (handicap: number): ValidationResult => {
    return validators.numberRange(
      handicap,
      VALIDATION.HANDICAP_MIN,
      VALIDATION.HANDICAP_MAX,
      '핸디캡'
    );
  },

  /**
   * Validate golf score
   */
  score: (score: number): ValidationResult => {
    return validators.numberRange(
      score,
      VALIDATION.SCORE_MIN,
      VALIDATION.SCORE_MAX,
      '스코어'
    );
  },

  /**
   * Validate driving distance
   */
  driveDistance: (distance: number): ValidationResult => {
    return validators.numberRange(
      distance,
      VALIDATION.DISTANCE_MIN,
      VALIDATION.DISTANCE_MAX,
      '드라이브 거리'
    );
  },

  /**
   * Validate image data (Base64)
   */
  imageData: (imageData: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!imageData) {
      errors.push('이미지를 선택해주세요');
    } else {
      // Check if it's valid base64
      try {
        const base64Pattern = /^data:image\/(jpeg|png|jpg|gif);base64,/;
        if (!base64Pattern.test(imageData)) {
          errors.push('유효한 이미지 형식이 아닙니다');
        }
        
        // Rough estimate of file size (Base64 is ~33% larger than binary)
        const estimatedSize = (imageData.length * 3) / 4;
        if (estimatedSize > 10 * 1024 * 1024) { // 10MB
          errors.push(ERROR_MESSAGES.FILE_TOO_LARGE);
        }
      } catch (error) {
        errors.push('이미지 데이터 형식이 올바르지 않습니다');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// ===========================================
// Form Validators
// ===========================================
export const formValidators = {
  /**
   * Validate login form
   */
  loginForm: (data: { email: string; password: string }): ValidationResult => {
    const allErrors: string[] = [];
    
    const emailResult = validators.email(data.email);
    const passwordResult = validators.required(data.password, '비밀번호');
    
    allErrors.push(...emailResult.errors, ...passwordResult.errors);
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  },

  /**
   * Validate registration form
   */
  registerForm: (data: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    name?: string;
  }): ValidationResult => {
    const allErrors: string[] = [];
    
    const emailResult = validators.email(data.email);
    const usernameResult = validators.username(data.username);
    const passwordResult = validators.password(data.password);
    const confirmResult = validators.confirmPassword(data.password, data.confirmPassword);
    
    allErrors.push(
      ...emailResult.errors,
      ...usernameResult.errors,
      ...passwordResult.errors,
      ...confirmResult.errors
    );
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  },

  /**
   * Validate profile update form
   */
  profileForm: (data: {
    name?: string;
    handicap?: number;
    driveDistance?: number;
  }): ValidationResult => {
    const allErrors: string[] = [];
    
    if (data.name) {
      const nameResult = validators.stringLength(data.name, 1, 50, '이름');
      allErrors.push(...nameResult.errors);
    }
    
    if (data.handicap !== undefined) {
      const handicapResult = golfValidators.handicap(data.handicap);
      allErrors.push(...handicapResult.errors);
    }
    
    if (data.driveDistance !== undefined) {
      const distanceResult = golfValidators.driveDistance(data.driveDistance);
      allErrors.push(...distanceResult.errors);
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
};

// ===========================================
// Validation Utilities
// ===========================================
export const validationUtils = {
  /**
   * Combine multiple validation results
   */
  combineResults: (...results: ValidationResult[]): ValidationResult => {
    const allErrors = results.flatMap(result => result.errors);
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  },

  /**
   * Get first error message from validation result
   */
  getFirstError: (result: ValidationResult): string | null => {
    return result.errors.length > 0 ? result.errors[0] : null;
  },

  /**
   * Check if any field has errors
   */
  hasErrors: (...results: ValidationResult[]): boolean => {
    return results.some(result => !result.isValid);
  },

  /**
   * Create validation result with custom error
   */
  createError: (message: string): ValidationResult => {
    return {
      isValid: false,
      errors: [message]
    };
  },

  /**
   * Create successful validation result
   */
  createSuccess: (): ValidationResult => {
    return {
      isValid: true,
      errors: []
    };
  }
};