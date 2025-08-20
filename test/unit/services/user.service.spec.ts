import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { mockPrisma, mockUser, mockUsers, mockCreateUserData } from '../../mocks/database.mock';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    // Reset mocks
    jest.clearAllMocks();
    mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const createUserDto = mockCreateUserData;
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: '3',
        ...createUserDto,
        password: 'hashedPassword',
        role: 'PASIEN',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: createUserDto.email }, { nik: createUserDto.nik }] },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          nik: createUserDto.nik,
          password: 'hashedPassword',
        },
        select: {
          id: true,
          nik: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result.id).toBe('3');
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      const createUserDto = mockCreateUserData;
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: createUserDto.email }, { nik: createUserDto.nik }] },
      });
    });

    it('should throw ConflictException when NIK already exists', async () => {
      // Arrange
      const createUserDto = { ...mockCreateUserData, email: 'different@email.com' };
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, nik: createUserDto.nik } as any);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('createFromOcr', () => {
    const ocrData = { nik: '1234567890123456', name: 'OCR User' };

    it('should return existing user if NIK already exists', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.createFromOcr(ocrData);

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { nik: ocrData.nik },
      });
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should create new user with random password if NIK does not exist', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const newUser = {
        id: '3',
        ...ocrData,
        email: `${ocrData.nik}@mediq.placeholder.email`,
        password: 'hashedPassword',
        role: 'PASIEN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(newUser as any);

      // Mock Math.random to return predictable value
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      // Act
      const result = await service.createFromOcr(ocrData);

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { nik: ocrData.nik },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalled();
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          nik: ocrData.nik,
          name: ocrData.name,
          email: `${ocrData.nik}@mediq.placeholder.email`,
          password: 'hashedPassword',
        },
      });
      expect(result).not.toHaveProperty('password');

      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('isNikRegistered', () => {
    it('should return true if NIK is registered', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' } as any);

      // Act
      const result = await service.isNikRegistered('1234567890123456');

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { nik: '1234567890123456' },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it('should return false if NIK is not registered', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isNikRegistered('1234567890123456');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findByNik', () => {
    it('should return user if found', async () => {
      // Arrange
      const userData = { id: '1', nik: '1234567890123456' };
      mockPrisma.user.findUnique.mockResolvedValue(userData as any);

      // Act
      const result = await service.findByNik('1234567890123456');

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { nik: '1234567890123456' },
        select: { id: true, nik: true },
      });
      expect(result).toEqual(userData);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByNik('1234567890123456')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByNikAndName', () => {
    it('should return user if NIK and name match (case insensitive)', async () => {
      // Arrange
      const userData = { ...mockUser, name: 'John Doe' };
      mockPrisma.user.findUnique.mockResolvedValue(userData as any);

      // Act
      const result = await service.findByNikAndName('1234567890123456', 'JOHN DOE');

      // Assert
      expect(result).toEqual(userData);
    });

    it('should return null if NIK exists but name does not match', async () => {
      // Arrange
      const userData = { ...mockUser, name: 'John Doe' };
      mockPrisma.user.findUnique.mockResolvedValue(userData as any);

      // Act
      const result = await service.findByNikAndName('1234567890123456', 'Jane Doe');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if NIK does not exist', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByNikAndName('1234567890123456', 'John Doe');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.findByEmail('john@example.com');

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('notfound@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          nik: true,
          name: true,
          email: true,
          role: true,
        },
      });
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array if no users found', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('updateRole', () => {
    it('should update user role successfully', async () => {
      // Arrange
      const userId = '1';
      const newRole = Role.ADMIN_FASKES;
      const updatedUser = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        role: newRole,
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);

      // Act
      const result = await service.updateRole(userId, newRole);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { role: newRole },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      const userId = '999';
      const newRole = Role.ADMIN_FASKES;
      mockPrisma.user.update.mockRejectedValue(new Error('Record not found'));

      // Act & Assert
      await expect(service.updateRole(userId, newRole)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const userId = '1';
      mockPrisma.user.delete.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.delete(userId);

      // Assert
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual({
        message: `User with id ${userId} deleted successfully`,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      const userId = '999';
      mockPrisma.user.delete.mockRejectedValue(new Error('Record not found'));

      // Act & Assert
      await expect(service.delete(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile if found', async () => {
      // Arrange
      const userId = '1';
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.getUserProfile(userId);

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          nik: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      const userId = '999';
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserProfile(userId)).rejects.toThrow(NotFoundException);
    });
  });
});
