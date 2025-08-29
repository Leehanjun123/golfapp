// Golf Pro - Shared Utility Functions

import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// ===========================================
// Date/Time Utilities
// ===========================================
export const dateUtils = {
  /**
   * Format date to Korean locale
   */
  formatDate: (date: Date | string, formatStr = 'yyyy년 M월 d일'): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: ko });
  },

  /**
   * Format time to Korean relative time
   */
  formatRelativeTime: (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { 
      addSuffix: true, 
      locale: ko 
    });
  },

  /**
   * Check if date is today
   */
  isToday: (date: Date | string): boolean => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  }
};

// ===========================================
// Number Utilities
// ===========================================
export const numberUtils = {
  /**
   * Format number with commas
   */
  formatNumber: (num: number): string => {
    return new Intl.NumberFormat('ko-KR').format(num);
  },

  /**
   * Round to specified decimal places
   */
  roundTo: (num: number, decimals = 2): number => {
    return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  /**
   * Clamp number between min and max
   */
  clamp: (num: number, min: number, max: number): number => {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Generate random number between min and max
   */
  randomBetween: (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  },

  /**
   * Convert meters to yards
   */
  metersToYards: (meters: number): number => {
    return meters * 1.09361;
  },

  /**
   * Convert yards to meters  
   */
  yardsToMeters: (yards: number): number => {
    return yards * 0.9144;
  }
};

// ===========================================
// String Utilities
// ===========================================
export const stringUtils = {
  /**
   * Capitalize first letter
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Truncate string with ellipsis
   */
  truncate: (str: string, length: number): string => {
    return str.length > length ? str.substring(0, length) + '...' : str;
  },

  /**
   * Generate random string
   */
  randomString: (length = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Convert to kebab-case
   */
  kebabCase: (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  },

  /**
   * Remove accents and special characters
   */
  removeAccents: (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
};

// ===========================================
// Array Utilities
// ===========================================
export const arrayUtils = {
  /**
   * Remove duplicates from array
   */
  unique: <T>(arr: T[]): T[] => {
    return [...new Set(arr)];
  },

  /**
   * Shuffle array randomly
   */
  shuffle: <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Group array by key
   */
  groupBy: <T>(arr: T[], key: keyof T): Record<string, T[]> => {
    return arr.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * Get random item from array
   */
  randomItem: <T>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /**
   * Chunk array into smaller arrays
   */
  chunk: <T>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
};

// ===========================================
// Object Utilities
// ===========================================
export const objectUtils = {
  /**
   * Deep clone object
   */
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => objectUtils.deepClone(item)) as unknown as T;
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = objectUtils.deepClone(obj[key]);
      }
    }
    return cloned;
  },

  /**
   * Check if object is empty
   */
  isEmpty: (obj: any): boolean => {
    if (!obj) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },

  /**
   * Pick specific keys from object
   */
  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const picked = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        picked[key] = obj[key];
      }
    });
    return picked;
  },

  /**
   * Omit specific keys from object
   */
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const omitted = { ...obj } as any;
    keys.forEach(key => {
      delete omitted[key];
    });
    return omitted;
  }
};

// ===========================================
// Async Utilities
// ===========================================
export const asyncUtils = {
  /**
   * Sleep for specified milliseconds
   */
  sleep: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry async function with exponential backoff
   */
  retry: async <T>(
    fn: () => Promise<T>,
    options: {
      retries?: number;
      delay?: number;
      backoff?: number;
    } = {}
  ): Promise<T> => {
    const { retries = 3, delay = 1000, backoff = 2 } = options;
    
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      
      await asyncUtils.sleep(delay);
      return asyncUtils.retry(fn, {
        retries: retries - 1,
        delay: delay * backoff,
        backoff
      });
    }
  },

  /**
   * Timeout for promises
   */
  timeout: <T>(promise: Promise<T>, ms: number): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
    return Promise.race([promise, timeoutPromise]);
  },

  /**
   * Debounce function calls
   */
  debounce: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Throttle function calls
   */
  throttle: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  }
};

// ===========================================
// Golf-Specific Utilities
// ===========================================
export const golfUtils = {
  /**
   * Calculate handicap index
   */
  calculateHandicap: (scores: number[], courseRatings: number[], slopeRatings: number[]): number => {
    if (scores.length < 3) return 0;
    
    const differentials = scores.map((score, i) => {
      const courseRating = courseRatings[i] || 72;
      const slopeRating = slopeRatings[i] || 113;
      return ((score - courseRating) * 113) / slopeRating;
    });
    
    differentials.sort((a, b) => a - b);
    const numScores = Math.min(differentials.length, 8);
    const avgDifferential = differentials.slice(0, numScores).reduce((sum, diff) => sum + diff, 0) / numScores;
    
    return numberUtils.roundTo(avgDifferential * 0.96, 1);
  },

  /**
   * Convert swing analysis score to grade
   */
  scoreToGrade: (score: number): { grade: string; label: string; color: string } => {
    if (score >= 90) return { grade: 'A+', label: '완벽함', color: '#4CAF50' };
    if (score >= 85) return { grade: 'A', label: '훌륭함', color: '#8BC34A' };
    if (score >= 80) return { grade: 'B+', label: '좋음', color: '#CDDC39' };
    if (score >= 75) return { grade: 'B', label: '양호함', color: '#FFC107' };
    if (score >= 70) return { grade: 'C+', label: '보통', color: '#FF9800' };
    if (score >= 65) return { grade: 'C', label: '개선 필요', color: '#FF5722' };
    return { grade: 'D', label: '많은 연습 필요', color: '#F44336' };
  },

  /**
   * Generate swing feedback based on score
   */
  generateFeedback: (pose: any): string[] => {
    const feedback: string[] = [];
    
    if (pose.shoulderRotation < 80) {
      feedback.push('어깨 회전을 더 크게 해보세요');
    }
    if (pose.xFactor < 20) {
      feedback.push('X-Factor를 늘려 파워를 증가시키세요');
    }
    if (Math.abs(pose.spineAngle) > 15) {
      feedback.push('척추 각도를 유지하세요');
    }
    if (pose.weightShift < 50) {
      feedback.push('체중 이동을 더 적극적으로 해보세요');
    }
    
    if (feedback.length === 0) {
      feedback.push('훌륭한 스윙입니다!');
    }
    
    return feedback;
  }
};