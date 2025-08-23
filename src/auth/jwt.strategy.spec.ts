import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { UnauthorizedException } from '@nestjs/common';

// Mock passport-jwt Strategy to avoid requiring a real secret during super() call
jest.mock('passport-jwt', () => {
  const actual = jest.requireActual('passport-jwt');
  return {
    ...actual,
    Strategy: class MockStrategy {
      public name = 'jwt';
      constructor() {}
    },
    ExtractJwt: { fromAuthHeaderAsBearerToken: jest.fn(() => jest.fn()) },
  };
});

// Bypass NestJS PassportStrategy mixin registration
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (S: any) => S,
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      return undefined;
    }),
  };

  const mockUserService = {
    getUserProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfig },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
    jest.clearAllMocks();
  });

  it('returns user when found', async () => {
    const payload = { sub: 'user-1' };
    const user = { id: 'user-1', email: 'a@b.c' };
    mockUserService.getUserProfile.mockResolvedValue(user);

    const res = await strategy.validate(payload as any);

    expect(mockUserService.getUserProfile).toHaveBeenCalledWith('user-1');
    expect(res).toEqual(user);
  });

  it('throws UnauthorizedException when user not found', async () => {
    const payload = { sub: 'missing' };
    mockUserService.getUserProfile.mockResolvedValue(null);

    await expect(strategy.validate(payload as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});