import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    validateAdmin: jest.fn(),
    login: jest.fn().mockResolvedValue({
      accessToken: 'mockAccessToken',
      refreshToken: 'mockRefreshToken',
    }),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  
  it('should login a user and return tokens', async () => {
    const loginDto = { email: 'test@example.com', password: 'password' };
    const userPayload = { id: 'some-id', email: 'test@example.com', role: 'ADMIN_FASKES' };

    // Atur agar mock validateAdmin mengembalikan user
    mockAuthService.validateAdmin.mockResolvedValue(userPayload);

    // Panggil metode controller, bukan service
    const result = await controller.login(loginDto);

    // Verifikasi bahwa metode yang benar dipanggil
    expect(mockAuthService.validateAdmin).toHaveBeenCalledWith(loginDto.email, loginDto.password);
    expect(mockAuthService.login).toHaveBeenCalledWith(userPayload);
    // Verifikasi hasilnya
    expect(result).toHaveProperty('accessToken');
  });
});