// 테스트 환경 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.PORT = 9999;

// 콘솔 로그 모킹 (테스트 중 불필요한 로그 숨김)
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// 테스트 후 정리
afterAll(() => {
  // 모든 타이머 정리
  jest.clearAllTimers();
  
  // 모든 모킹 초기화
  jest.clearAllMocks();
});