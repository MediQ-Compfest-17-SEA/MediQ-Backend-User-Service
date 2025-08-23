import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

 // Mock bcrypt functions to be controllable in tests
jest.mock('bcrypt', () => ({
  ...jest.requireActual('bcrypt'),
  hash: jest.fn().mockResolvedValue('hashed-refresh-token'),
  compare: jest.fn(), // set per-test with mockResolvedValue(true/false)
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUserService = { findByEmail: jest.fn(), findByNikAndName: jest.fn() };
  const mockPrismaService: any = { user: { update: jest.fn() } };
  const mockConfigService = { get: jest.fn((key) => `mock-value-for-${key}`) };
  
  // Atur mock untuk mengembalikan nilai berbeda pada setiap pemanggilan
  const mockJwtService = {
    sign: jest.fn()
      .mockReturnValueOnce('mock-access-token')  // Panggilan pertama
      .mockReturnValueOnce('mock-refresh-token'), // Panggilan kedua
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
    
    // Reset mock agar urutan pemanggilan benar untuk setiap tes
    (jwtService.sign as jest.Mock).mockClear().mockReturnValueOnce('mock-access-token').mockReturnValueOnce('mock-refresh-token');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refreshTokens', () => {
    it('returns new access token when refresh token matches', async () => {
      // Ensure prisma has findUnique for this test
      (mockPrismaService as any).user.findUnique = jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        role: Role.PASIEN,
        hashedRefreshToken: 'stored-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockJwtService.sign as jest.Mock).mockReturnValue('new-access-token');

      const result = await service.refreshTokens('u1', 'refresh-token');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('refresh-token', 'stored-hash');
      expect(result).toEqual({ accessToken: 'mock-access-token' });
    });

    it('throws UnauthorizedException when user not found or missing hashedRefreshToken', async () => {
      (mockPrismaService as any).user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.refreshTokens('nope', 'rt')).rejects.toBeInstanceOf(UnauthorizedException);

      (mockPrismaService as any).user.findUnique = jest.fn().mockResolvedValue({
        id: 'u2',
        email: 'e',
        role: Role.PASIEN,
        hashedRefreshToken: null,
      });
      await expect(service.refreshTokens('u2', 'rt')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token hash does not match', async () => {
      (mockPrismaService as any).user.findUnique = jest.fn().mockResolvedValue({
        id: 'u3',
        email: 'mismatch@example.com',
        role: Role.PASIEN,
        hashedRefreshToken: 'stored-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens('u3', 'wrong-rt')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong-rt', 'stored-hash');
    });
  });

  describe('logout', () => {
    it('clears hashedRefreshToken via prisma update', async () => {
      await service.logout('user-logout');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-logout' },
        data: { hashedRefreshToken: null },
      });
    });
  });
  
  it('should return tokens when a user logs in', async () => {
    const user = { id: 'some-id', email: 'test@example.com', role: 'USER' };
    const result = await service.login(user);

    // Tes ini sekarang seharusnya berhasil
    expect(result).toHaveProperty('accessToken', 'mock-access-token');
    expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
    expect(jwtService.sign).toHaveBeenCalledTimes(2);
    expect(mockPrismaService.user.update).toHaveBeenCalled();
  });
  describe('validateAdmin negative paths', () => {
    it('returns null when password mismatch', async () => {
      (mockUserService as any).findByEmail.mockResolvedValue({
        email: 'admin@test.com',
        password: 'hashed',
        role: Role.ADMIN_FASKES,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = await service.validateAdmin('admin@test.com', 'wrong');
      expect(res).toBeNull();
    });

    it('returns null when user has no password set', async () => {
      (mockUserService as any).findByEmail.mockResolvedValue({
        email: 'admin@test.com',
        password: null,
        role: Role.ADMIN_FASKES,
      });

      const res = await service.validateAdmin('admin@test.com', 'any');
      expect(res).toBeNull();
    });
  });

  describe('loginUser additional branches', () => {
    it('returns tokens when user is found by NIK and name', async () => {
      (mockUserService as any).findByNikAndName.mockResolvedValue({
        id: 'user-77',
        email: 'u77@example.com',
        role: Role.PASIEN,
      });

      const res = await service.loginUser('NIK77', 'John Doe');
      expect((mockUserService as any).findByNikAndName).toHaveBeenCalledWith('NIK77', 'John Doe');

      expect(res).toHaveProperty('accessToken', 'mock-access-token');
      expect(res).toHaveProperty('refreshToken', 'mock-refresh-token');

      expect((mockPrismaService as any).user.update).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user not found by NIK and name', async () => {
      (mockUserService as any).findByNikAndName.mockResolvedValue(null);
      await expect(service.loginUser('NIK404', 'Missing')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('validateAdmin additional negative', () => {
    it('returns null when user not found', async () => {
      (mockUserService as any).findByEmail.mockResolvedValue(null);
      const res = await service.validateAdmin('no@admin.com', 'pw');
      expect(res).toBeNull();
    });
  });

  describe('refreshTokens additional negative', () => {
    it('throws UnauthorizedException when hashedRefreshToken is empty string', async () => {
      (mockPrismaService as any).user.findUnique = jest.fn().mockResolvedValue({
        id: 'u9',
        email: 'u9@example.com',
        role: Role.PASIEN,
        hashedRefreshToken: '',
      });

      await expect(service.refreshTokens('u9', 'rt')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('validateUser additional branch', () => {
    it('returns user data when credentials are valid', async () => {
      const user = { email: 'u@test.com', password: 'hashed' };
      (mockUserService as any).findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const { password, ...expected } = user as any;
      const res = await service.validateUser('u@test.com', 'pw');
      expect(res).toEqual(expected);
    });

    it('returns null when user not found', async () => {
      (mockUserService as any).findByEmail.mockResolvedValue(null);
      const res = await service.validateUser('missing@test.com', 'pw');
      expect(res).toBeNull();
    });

    it('returns null when user exists but has no password set', async () => {
      (mockUserService as any).findByEmail.mockResolvedValue({
        email: 'nopass@example.com',
        password: null,
      });
      const result = await service.validateUser('nopass@example.com', 'any');
      expect(result).toBeNull();
    });
  });
});
describe('AuthService.validateAdmin positive path (isolated)', () => {
  let localService: AuthService;
  let localUserService: any;
  let localPrisma: any;
  let localJwt: any;
  let localConfig: any;

  beforeEach(async () => {
    localUserService = { findByEmail: jest.fn() };
    localPrisma = { user: { update: jest.fn() } };
    localJwt = { sign: jest.fn().mockReturnValue('jwt-token') };
    localConfig = { get: jest.fn(() => 'mock-secret') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: localUserService },
        { provide: JwtService, useValue: localJwt },
        { provide: PrismaService, useValue: localPrisma },
        { provide: ConfigService, useValue: localConfig },
      ],
    }).compile();

    localService = module.get(AuthService);
  });

  it('returns admin data when password matches and role is not PASIEN', async () => {
    localUserService.findByEmail.mockResolvedValue({
      id: 'a1',
      email: 'admin@test.com',
      password: 'hashed',
      role: Role.ADMIN_FASKES,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await localService.validateAdmin('admin@test.com', 'pw');
    expect(res).toEqual({
      id: 'a1',
      email: 'admin@test.com',
      role: Role.ADMIN_FASKES,
    });
  });
});