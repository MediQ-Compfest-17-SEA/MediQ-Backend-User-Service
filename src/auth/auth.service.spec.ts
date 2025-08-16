import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUserService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockPrismaService = {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(key => {
      if (key === 'JWT_SECRET') return 'secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  it('should return tokens when a user logs in', async () => {
    const user = { id: 'some-id', email: 'test@example.com', role: 'USER' };
    const result = await service.login(user);

    expect(result).toHaveProperty('accessToken', 'mock-token');
    expect(result).toHaveProperty('refreshToken', 'mock-token');
    expect(jwtService.sign).toHaveBeenCalledTimes(2);
  });
});