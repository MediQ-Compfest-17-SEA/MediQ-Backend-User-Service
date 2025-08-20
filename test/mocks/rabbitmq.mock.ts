import { ClientProxy } from '@nestjs/microservices';

export const mockRabbitMQClient: jest.Mocked<ClientProxy> = {
  send: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

export const createMockRabbitMQResponse = <T>(data: T) => ({
  toPromise: jest.fn().mockResolvedValue(data),
});

export const mockRabbitMQProvider = {
  provide: 'RABBITMQ_SERVICE',
  useValue: mockRabbitMQClient,
};

// Message patterns used in services
export const MessagePatterns = {
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_FIND_BY_ID: 'user.findById',
  USER_FIND_BY_EMAIL: 'user.findByEmail',
  AUTH_LOGIN: 'auth.login',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_LOGOUT: 'auth.logout',
} as const;
