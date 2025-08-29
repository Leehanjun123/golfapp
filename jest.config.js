// Golf Pro - Root Jest Configuration

module.exports = {
  // 모노레포 프로젝트 구성
  projects: [
    '<rootDir>/apps/api',
    '<rootDir>/apps/mobile', 
    '<rootDir>/packages/shared',
    '<rootDir>/packages/types'
  ],
  
  // 전역 설정
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // 커버리지 대상 파일
  collectCoverageFrom: [
    '**/src/**/*.{js,ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.d.ts',
    '!**/jest.config.js'
  ],
  
  // 커버리지 임계값
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // 테스트 환경
  testEnvironment: 'node',
  
  // 타임아웃 설정
  testTimeout: 10000,
  
  // 병렬 실행 설정
  maxWorkers: '50%',
  
  // 경고 및 에러 처리
  verbose: true,
  bail: false,
  
  // 모듈 경로 매핑
  moduleNameMapping: {
    '^@golf-pro/types(.*)$': '<rootDir>/packages/types/src$1',
    '^@golf-pro/shared(.*)$': '<rootDir>/packages/shared/src$1',
    '^@golf-pro/ui(.*)$': '<rootDir>/packages/ui/src$1'
  }
};