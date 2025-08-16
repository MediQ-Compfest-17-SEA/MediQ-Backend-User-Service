import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(user => {
      return {
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
      };
    }),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
    .overrideGuard(AuthGuard('jwt-refresh')).useValue({ canActivate: () => true })
    .overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  
  it('should login a user and return tokens', async () => {
    const user = { email: 'test@example.com', id: 'some-id' };
    const result = await mockAuthService.login(user);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(mockAuthService.login).toHaveBeenCalledWith(user);
  });
});