module.exports = {
  displayName: '@golf-pro/api',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 테스트 파일 위치
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(js|ts)',
    '<rootDir>/src/**/*.(test|spec).(js|ts)',
    '<rootDir>/tests/**/*.(test|spec).(js|ts)'
  ],
  
  // 커버리지 설정
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.test.{js,ts}',
    '!src/**/__tests__/**',
    '!**/node_modules/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/backup/',
    '/uploads/',
    '/dist/'
  ],
  
  // 커버리지 목표
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // 테스트 전 설정 파일
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // 모듈 경로 매핑 - 모노레포 지원
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@golf-pro/types(.*)$': '<rootDir>/../../packages/types/src$1',
    '^@golf-pro/shared(.*)$': '<rootDir>/../../packages/shared/src$1'
  },
  
  // TypeScript 변환
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // 타임아웃 설정
  testTimeout: 15000,
  
  // 상세 출력
  verbose: true,
  
  // 환경 변수
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // 무시할 경로
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ]
};