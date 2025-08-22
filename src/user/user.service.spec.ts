import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt.compare karena ini operasi async
jest.mock('bcrypt', () => ({
  ...jest.requireActual('bcrypt'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;

  const mockUserService = {
    findByEmail: jest.fn(),
  };

  const mockPrismaService = {
    user: { update: jest.fn() },
  };
  
  const mockJwtService = { sign: jest.fn().mockReturnValue('mock-token') };
  const mockConfigService = { get: jest.fn().mockReturnValue('mock-secret') };

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
    userService = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data if credentials are valid', async () => {
      const user = { email: 'test@test.com', password: 'hashedPassword' };
      mockUserService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const { password, ...expectedResult } = user;
      const result = await service.validateUser('test@test.com', 'password123');
      
      expect(result).toEqual(expectedResult);
    });

    it('should return null if password does not match', async () => {
      const user = { email: 'test@test.com', password: 'hashedPassword' };
      mockUserService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Password salah
      
      const result = await service.validateUser('test@test.com', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('should return null if user does not exist', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      const result = await service.validateUser('notfound@test.com', 'password123');
      expect(result).toBeNull();
    });
  });

  describe('validateAdmin', () => {
    it('should return admin data if credentials are valid and role is not PASIEN', async () => {
        const adminUser = { email: 'admin@test.com', password: 'hashedPassword', role: Role.ADMIN_FASKES };
        mockUserService.findByEmail.mockResolvedValue(adminUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const { password, ...expectedResult } = adminUser;
        const result = await service.validateAdmin('admin@test.com', 'password123');

        expect(result).toEqual(expectedResult);
    });

    it('should return null if user is a PASIEN', async () => {
        const patientUser = { email: 'patient@test.com', password: 'hashedPassword', role: Role.PASIEN };
        mockUserService.findByEmail.mockResolvedValue(patientUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        
        const result = await service.validateAdmin('patient@test.com', 'password123');
        expect(result).toBeNull();
    });
  });
});