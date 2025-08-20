import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mockPrisma, mockUser, mockAdminUser } from '../../mocks/database.mock';
import { mockJwtService, mockJwtTokens } from '../../mocks/jwt.mock';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    findByNikAndName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    configService = module.get(ConfigService);

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      // Arrange
      const email = 'john@example.com';
      const password = 'password123';
      const user = { ...mockUser, password: 'hashedPassword' };
      
      mockUserService.findByEmail.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, user.password);
      expect(result).toEqual({ ...user, password: undefined });
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user does not exist', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'password123';
      
      mockUserService.findByEmail.mockResolvedValue(null);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toBeNull();
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      // Arrange
      const email = 'john@example.com';
      const password = 'wrongpassword';
      const user = { ...mockUser, password: 'hashedPassword' };
      
      mockUserService.findByEmail.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validateAdmin', () => {
    it('should return admin user without password when credentials are valid', async () => {
      // Arrange
      const email = 'admin@example.com';
      const password = 'password123';
      const admin = { ...mockAdminUser, password: 'hashedPassword' };
      
      mockUserService.findByEmail.mockResolvedValue(admin as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.validateAdmin(email, password);

      // Assert
      expect(result).toEqual({ ...admin, password: undefined });
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user is PASIEN', async () => {
      // Arrange
      const email = 'patient@example.com';
      const password = 'password123';
      const patient = { ...mockUser, password: 'hashedPassword', role: Role.PASIEN };
      
      mockUserService.findByEmail.mockResolvedValue(patient as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.validateAdmin(email, password);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      // Arrange
      const email = 'admin@example.com';
      const password = 'wrongpassword';
      const admin = { ...mockAdminUser, password: 'hashedPassword' };
      
      mockUserService.findByEmail.mockResolvedValue(admin as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.validateAdmin(email, password);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('loginUser', () => {
    it('should return tokens when NIK and name match', async () => {
      // Arrange
      const nik = '1234567890123456';
      const name = 'John Doe';
      const user = mockUser;
      
      mockUserService.findByNikAndName.mockResolvedValue(user as any);
      mockJwtService.sign.mockImplementation((payload) => {
        if (payload.sub && !payload.email) return mockJwtTokens.refreshToken;
        return mockJwtTokens.accessToken;
      });
      mockedBcrypt.hash.mockResolvedValue('hashedRefreshToken' as never);
      mockPrisma.user.update.mockResolvedValue(user as any);

      // Act
      const result = await service.loginUser(nik, name);

      // Assert
      expect(mockUserService.findByNikAndName).toHaveBeenCalledWith(nik, name);
      expect(result).toEqual({
        accessToken: mockJwtTokens.accessToken,
        refreshToken: mockJwtTokens.refreshToken,
      });
    });

    it('should throw UnauthorizedException when NIK and name do not match', async () => {
      // Arrange
      const nik = '1234567890123456';
      const name = 'Wrong Name';
      
      mockUserService.findByNikAndName.mockResolvedValue(null);

      // Act & Assert
      await expect(service.loginUser(nik, name)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should generate access and refresh tokens', async () => {
      // Arrange
      const user = mockUser;
      mockJwtService.sign.mockImplementation((payload) => {
        if (payload.sub && !payload.email) return mockJwtTokens.refreshToken;
        return mockJwtTokens.accessToken;
      });
      mockedBcrypt.hash.mockResolvedValue('hashedRefreshToken' as never);
      mockPrisma.user.update.mockResolvedValue(user as any);

      // Act
      const result = await service.login(user);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { email: user.email, sub: user.id, role: user.role },
        expect.objectContaining({
          secret: 'test-secret',
          expiresIn: '15m',
        })
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: user.id },
        expect.objectContaining({
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        })
      );
      expect(result).toEqual({
        accessToken: mockJwtTokens.accessToken,
        refreshToken: mockJwtTokens.refreshToken,
      });
    });

    it('should update refresh token hash in database', async () => {
      // Arrange
      const user = mockUser;
      mockJwtService.sign.mockImplementation(() => mockJwtTokens.refreshToken);
      mockedBcrypt.hash.mockResolvedValue('hashedRefreshToken' as never);
      mockPrisma.user.update.mockResolvedValue(user as any);

      // Act
      await service.login(user);

      // Assert
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(mockJwtTokens.refreshToken, 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { hashedRefreshToken: 'hashedRefreshToken' },
      });
    });
  });

  describe('logout', () => {
    it('should clear refresh token hash from database', async () => {
      // Arrange
      const userId = '1';
      const updatedUser = { ...mockUser, hashedRefreshToken: null };
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);

      // Act
      const result = await service.logout(userId);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('refreshTokens', () => {
    it('should return new access token when refresh token is valid', async () => {
      // Arrange
      const userId = '1';
      const refreshToken = 'valid-refresh-token';
      const user = { ...mockUser, hashedRefreshToken: 'hashedRefreshToken' };
      
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue(mockJwtTokens.accessToken);

      // Act
      const result = await service.refreshTokens(userId, refreshToken);

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        refreshToken,
        user.hashedRefreshToken
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        role: user.role,
      });
      expect(result).toEqual({ accessToken: mockJwtTokens.accessToken });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      const userId = '999';
      const refreshToken = 'some-token';
      
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when user has no refresh token', async () => {
      // Arrange
      const userId = '1';
      const refreshToken = 'some-token';
      const user = { ...mockUser, hashedRefreshToken: null };
      
      mockPrisma.user.findUnique.mockResolvedValue(user as any);

      // Act & Assert
      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when refresh token does not match', async () => {
      // Arrange
      const userId = '1';
      const refreshToken = 'invalid-token';
      const user = { ...mockUser, hashedRefreshToken: 'hashedRefreshToken' };
      
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
