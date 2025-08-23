import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController (additional coverage)', () => {
  let controller: AuthController;

  const mockAuthService = {
    validateAdmin: jest.fn(),
    login: jest.fn(),
    loginUser: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(AuthGuard('jwt-refresh'))
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('loginUser calls service.loginUser with nik and name', async () => {
    mockAuthService.loginUser.mockResolvedValue({ accessToken: 'a', refreshToken: 'b' });
    const dto = { nik: '123', name: 'John' };
    const res = await controller.loginUser(dto as any);
    expect(mockAuthService.loginUser).toHaveBeenCalledWith('123', 'John');
    expect(res).toEqual({ accessToken: 'a', refreshToken: 'b' });
  });

  it('loginUser throws UnauthorizedException when service rejects', async () => {
    mockAuthService.loginUser.mockRejectedValue(new UnauthorizedException('not found'));
    await expect(controller.loginUser({ nik: 'x', name: 'y' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh calls service.refreshTokens with req.user payload', async () => {
    mockAuthService.refreshTokens.mockResolvedValue({ accessToken: 'new' });
    const req = { user: { sub: 'u1', refreshToken: 'rt' } };
    const res = await controller.refreshTokens(req as any);
    expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('u1', 'rt');
    expect(res).toEqual({ accessToken: 'new' });
  });

  it('logout calls service.logout with user id from req.user', async () => {
    mockAuthService.logout.mockResolvedValue({ success: true });
    const req = { user: { id: 'u2' } };
    const res = await controller.logout(req as any);
    expect(mockAuthService.logout).toHaveBeenCalledWith('u2');
    expect(res).toEqual({ success: true });
  });
});