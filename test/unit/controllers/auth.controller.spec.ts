import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { AdminLoginDto } from 'src/auth/dto/admin-login.dto';
import { UserLoginDto } from 'src/auth/dto/user-login.dto';
import { mockUser, mockAdminUser } from '../../mocks/database.mock';
import { mockJwtTokens } from '../../mocks/jwt.mock';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    validateAdmin: jest.fn(),
    loginUser: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
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
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login admin successfully with valid credentials', async () => {
      // Arrange
      const adminLoginDto: AdminLoginDto = {
        email: 'admin@example.com',
        password: 'password123',
      };
      const tokens = {
        accessToken: mockJwtTokens.accessToken,
        refreshToken: mockJwtTokens.refreshToken,
      };
      
      mockAuthService.validateAdmin.mockResolvedValue(mockAdminUser);
      mockAuthService.login.mockResolvedValue(tokens);

      // Act
      const result = await controller.login(adminLoginDto);

      // Assert
      expect(authService.validateAdmin).toHaveBeenCalledWith(
        adminLoginDto.email,
        adminLoginDto.password
      );
      expect(authService.login).toHaveBeenCalledWith(mockAdminUser);
      expect(result).toEqual(tokens);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      // Arrange
      const adminLoginDto: AdminLoginDto = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };
      
      mockAuthService.validateAdmin.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.login(adminLoginDto)).rejects.toThrow(
        new UnauthorizedException('Kredensial tidak valid.')
      );
      expect(authService.validateAdmin).toHaveBeenCalledWith(
        adminLoginDto.email,
        adminLoginDto.password
      );
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is a patient', async () => {
      // Arrange
      const adminLoginDto: AdminLoginDto = {
        email: 'patient@example.com',
        password: 'password123',
      };
      
      mockAuthService.validateAdmin.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.login(adminLoginDto)).rejects.toThrow(
        new UnauthorizedException('Kredensial tidak valid.')
      );
    });
  });

  describe('loginUser', () => {
    it('should login user successfully with valid NIK and name', async () => {
      // Arrange
      const userLoginDto: UserLoginDto = {
        nik: '1234567890123456',
        name: 'John Doe',
      };
      const tokens = {
        accessToken: mockJwtTokens.accessToken,
        refreshToken: mockJwtTokens.refreshToken,
      };
      
      mockAuthService.loginUser.mockResolvedValue(tokens);

      // Act
      const result = await controller.loginUser(userLoginDto);

      // Assert
      expect(authService.loginUser).toHaveBeenCalledWith(
        userLoginDto.nik,
        userLoginDto.name
      );
      expect(result).toEqual(tokens);
    });

    it('should throw UnauthorizedException when NIK and name do not match', async () => {
      // Arrange
      const userLoginDto: UserLoginDto = {
        nik: '1234567890123456',
        name: 'Wrong Name',
      };
      const error = new UnauthorizedException(
        'Pengguna dengan NIK dan Nama tersebut tidak ditemukan.'
      );
      
      mockAuthService.loginUser.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.loginUser(userLoginDto)).rejects.toThrow(error);
      expect(authService.loginUser).toHaveBeenCalledWith(
        userLoginDto.nik,
        userLoginDto.name
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      const mockRequest = {
        user: {
          sub: '1',
          refreshToken: 'valid-refresh-token',
        },
      };
      const newTokens = { accessToken: 'new-access-token' };
      
      mockAuthService.refreshTokens.mockResolvedValue(newTokens);

      // Act
      const result = await controller.refreshTokens(mockRequest);

      // Assert
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        mockRequest.user.sub,
        mockRequest.user.refreshToken
      );
      expect(result).toEqual(newTokens);
    });

    it('should handle invalid refresh token', async () => {
      // Arrange
      const mockRequest = {
        user: {
          sub: '1',
          refreshToken: 'invalid-refresh-token',
        },
      };
      const error = new UnauthorizedException('Akses Ditolak');
      
      mockAuthService.refreshTokens.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.refreshTokens(mockRequest)).rejects.toThrow(error);
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        mockRequest.user.sub,
        mockRequest.user.refreshToken
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const mockRequest = {
        user: {
          id: '1',
        },
      };
      const logoutResult = { ...mockUser, hashedRefreshToken: null };
      
      mockAuthService.logout.mockResolvedValue(logoutResult);

      // Act
      const result = await controller.logout(mockRequest);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith(mockRequest.user.id);
      expect(result).toEqual(logoutResult);
    });

    it('should handle logout for non-existent user', async () => {
      // Arrange
      const mockRequest = {
        user: {
          id: '999',
        },
      };
      const error = new Error('User not found');
      
      mockAuthService.logout.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.logout(mockRequest)).rejects.toThrow(error);
    });
  });
});
