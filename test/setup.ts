import 'reflect-metadata';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/mediq_user_test';
  process.env.RABBITMQ_URL = 'amqp://localhost:5672';
});

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
});

// Silence console warnings in tests
console.warn = jest.fn();
console.error = jest.fn();
