import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

// Mock bcrypt.hash untuk mencegah error dan mempercepat tes
jest.mock('bcrypt', () => ({
  ...jest.requireActual('bcrypt'),
  hash: jest.fn().mockResolvedValue('hashed-refresh-token'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUserService = { findByEmail: jest.fn() };
  const mockPrismaService = { user: { update: jest.fn() } };
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
  
  it('should return tokens when a user logs in', async () => {
    const user = { id: 'some-id', email: 'test@example.com', role: 'USER' };
    const result = await service.login(user);

    // Tes ini sekarang seharusnya berhasil
    expect(result).toHaveProperty('accessToken', 'mock-access-token');
    expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
    expect(jwtService.sign).toHaveBeenCalledTimes(2);
    expect(mockPrismaService.user.update).toHaveBeenCalled();
  });
});