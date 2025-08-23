import { Test, TestingModule } from '@nestjs/testing';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

// Mock passport-jwt Strategy to avoid requiring a real secret during super() call
jest.mock('passport-jwt', () => {
  const actual = jest.requireActual('passport-jwt');
  return {
    ...actual,
    Strategy: class MockStrategy {
      constructor() {}
    },
    ExtractJwt: { fromAuthHeaderAsBearerToken: jest.fn(() => jest.fn()) },
  };
});

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    strategy = module.get(JwtRefreshStrategy);
    jest.clearAllMocks();
  });

  it('returns payload merged with refreshToken when Authorization header present', async () => {
    const req = {
      get: (name: string) => (name.toLowerCase() === 'authorization' ? 'Bearer REFRESH_TOKEN_123' : undefined),
    } as any;

    const result = await strategy.validate(req, { sub: 'user-1' } as any);

    expect(result).toEqual({ sub: 'user-1', refreshToken: 'REFRESH_TOKEN_123' });
  });

  it('throws UnauthorizedException when Authorization header missing', async () => {
    const req = { get: () => undefined } as any;
    await expect(strategy.validate(req, { sub: 'user-2' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});