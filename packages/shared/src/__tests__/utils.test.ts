// Golf Pro - Shared Utilities Tests

import { 
  numberUtils, 
  stringUtils, 
  arrayUtils, 
  objectUtils, 
  golfUtils 
} from '../utils';

describe('numberUtils', () => {
  describe('formatNumber', () => {
    it('should format numbers with Korean locale', () => {
      expect(numberUtils.formatNumber(1234)).toBe('1,234');
      expect(numberUtils.formatNumber(1234567)).toBe('1,234,567');
    });
  });

  describe('roundTo', () => {
    it('should round to specified decimal places', () => {
      expect(numberUtils.roundTo(3.14159, 2)).toBe(3.14);
      expect(numberUtils.roundTo(3.14159, 4)).toBe(3.1416);
    });
  });

  describe('clamp', () => {
    it('should clamp number between min and max', () => {
      expect(numberUtils.clamp(5, 0, 10)).toBe(5);
      expect(numberUtils.clamp(-5, 0, 10)).toBe(0);
      expect(numberUtils.clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('metersToYards', () => {
    it('should convert meters to yards correctly', () => {
      expect(numberUtils.roundTo(numberUtils.metersToYards(100), 2)).toBe(109.36);
      expect(numberUtils.roundTo(numberUtils.metersToYards(200), 2)).toBe(218.72);
    });
  });
});

describe('stringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize first letter and lowercase the rest', () => {
      expect(stringUtils.capitalize('hello')).toBe('Hello');
      expect(stringUtils.capitalize('HELLO')).toBe('Hello');
      expect(stringUtils.capitalize('hELLO wORLD')).toBe('Hello world');
    });
  });

  describe('truncate', () => {
    it('should truncate string with ellipsis', () => {
      expect(stringUtils.truncate('Hello World', 5)).toBe('Hello...');
      expect(stringUtils.truncate('Hi', 5)).toBe('Hi');
    });
  });

  describe('kebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(stringUtils.kebabCase('HelloWorld')).toBe('hello-world');
      expect(stringUtils.kebabCase('Hello World')).toBe('hello-world');
      expect(stringUtils.kebabCase('hello_world')).toBe('hello-world');
    });
  });
});

describe('arrayUtils', () => {
  describe('unique', () => {
    it('should remove duplicates from array', () => {
      expect(arrayUtils.unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(arrayUtils.unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });
  });

  describe('groupBy', () => {
    it('should group array by key', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 }
      ];
      
      const grouped = arrayUtils.groupBy(items, 'category');
      
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
      expect(grouped.A[0].value).toBe(1);
      expect(grouped.A[1].value).toBe(3);
    });
  });

  describe('chunk', () => {
    it('should chunk array into smaller arrays', () => {
      expect(arrayUtils.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(arrayUtils.chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });
  });
});

describe('objectUtils', () => {
  describe('isEmpty', () => {
    it('should check if object is empty', () => {
      expect(objectUtils.isEmpty({})).toBe(true);
      expect(objectUtils.isEmpty([])).toBe(true);
      expect(objectUtils.isEmpty('')).toBe(true);
      expect(objectUtils.isEmpty(null)).toBe(true);
      expect(objectUtils.isEmpty(undefined)).toBe(true);
      
      expect(objectUtils.isEmpty({ a: 1 })).toBe(false);
      expect(objectUtils.isEmpty([1])).toBe(false);
      expect(objectUtils.isEmpty('hello')).toBe(false);
    });
  });

  describe('pick', () => {
    it('should pick specific keys from object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(objectUtils.pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });
  });

  describe('omit', () => {
    it('should omit specific keys from object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(objectUtils.omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
    });
  });
});

describe('golfUtils', () => {
  describe('scoreToGrade', () => {
    it('should convert score to grade correctly', () => {
      expect(golfUtils.scoreToGrade(95).grade).toBe('A+');
      expect(golfUtils.scoreToGrade(85).grade).toBe('A');
      expect(golfUtils.scoreToGrade(75).grade).toBe('B');
      expect(golfUtils.scoreToGrade(65).grade).toBe('C');
      expect(golfUtils.scoreToGrade(55).grade).toBe('D');
      
      expect(golfUtils.scoreToGrade(95).label).toBe('완벽함');
      expect(golfUtils.scoreToGrade(55).label).toBe('많은 연습 필요');
    });
  });

  describe('calculateHandicap', () => {
    it('should calculate handicap correctly', () => {
      const scores = [85, 87, 89, 86, 88];
      const courseRatings = [72, 72, 72, 72, 72];
      const slopeRatings = [113, 113, 113, 113, 113];
      
      const handicap = golfUtils.calculateHandicap(scores, courseRatings, slopeRatings);
      expect(handicap).toBeGreaterThan(10);
      expect(handicap).toBeLessThan(20);
    });
    
    it('should return 0 for insufficient scores', () => {
      const handicap = golfUtils.calculateHandicap([85, 87], [72, 72], [113, 113]);
      expect(handicap).toBe(0);
    });
  });

  describe('generateFeedback', () => {
    it('should generate appropriate feedback', () => {
      const goodPose = {
        shoulderRotation: 90,
        xFactor: 25,
        spineAngle: 5,
        weightShift: 60
      };
      
      const feedback = golfUtils.generateFeedback(goodPose);
      expect(feedback).toContain('훌륭한 스윙입니다!');
    });
    
    it('should suggest improvements for poor form', () => {
      const poorPose = {
        shoulderRotation: 60,
        xFactor: 10,
        spineAngle: 20,
        weightShift: 30
      };
      
      const feedback = golfUtils.generateFeedback(poorPose);
      expect(feedback.length).toBeGreaterThan(1);
      expect(feedback.some(f => f.includes('어깨 회전'))).toBe(true);
      expect(feedback.some(f => f.includes('X-Factor'))).toBe(true);
    });
  });
});