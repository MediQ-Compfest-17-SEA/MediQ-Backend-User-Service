import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserController } from 'src/user/user.controller';
import { UserService } from 'src/user/user.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateRoleDto } from 'src/auth/dto/update-role.dto';
import { Role } from '@prisma/client';
import { mockUser, mockUsers, mockCreateUserData } from '../../mocks/database.mock';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockUserService = {
    create: jest.fn(),
    createFromOcr: jest.fn(),
    isNikRegistered: jest.fn(),
    findByNik: jest.fn(),
    findAll: jest.fn(),
    updateRole: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const createUserDto: CreateUserDto = mockCreateUserData as CreateUserDto;
      const expectedResult = { id: '3', ...mockCreateUserData };
      mockUserService.create.mockResolvedValue(expectedResult as any);

      // Act
      const result = await controller.create(createUserDto);

      // Assert
      expect(userService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      // Arrange
      const createUserDto: CreateUserDto = mockCreateUserData as CreateUserDto;
      const error = new Error('Service error');
      mockUserService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createUserDto)).rejects.toThrow(error);
    });
  });

  describe('handleUserRegisterFromOcr', () => {
    it('should handle OCR user registration successfully', async () => {
      // Arrange
      const ocrData = { nik: '1234567890123456', name: 'OCR User' };
      mockUserService.createFromOcr.mockResolvedValue(mockUser as any);

      // Act
      await controller.handleUserRegisterFromOcr(ocrData);

      // Assert
      expect(userService.createFromOcr).toHaveBeenCalledWith(ocrData);
    });

    it('should log error when OCR registration fails', async () => {
      // Arrange
      const ocrData = { nik: '1234567890123456', name: 'OCR User' };
      const error = new Error('OCR registration failed');
      mockUserService.createFromOcr.mockRejectedValue(error);
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await controller.handleUserRegisterFromOcr(ocrData);

      // Assert
      expect(userService.createFromOcr).toHaveBeenCalledWith(ocrData);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create user from OCR:', error);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('checkNik', () => {
    it('should return void when NIK is registered', async () => {
      // Arrange
      const nik = '1234567890123456';
      mockUserService.isNikRegistered.mockResolvedValue(true);

      // Act
      const result = await controller.checkNik(nik);

      // Assert
      expect(userService.isNikRegistered).toHaveBeenCalledWith(nik);
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when NIK is not registered', async () => {
      // Arrange
      const nik = '1234567890123456';
      mockUserService.isNikRegistered.mockResolvedValue(false);

      // Act & Assert
      await expect(controller.checkNik(nik)).rejects.toThrow(NotFoundException);
      expect(userService.isNikRegistered).toHaveBeenCalledWith(nik);
    });
  });

  describe('checkNikExists', () => {
    it('should return true when NIK exists', async () => {
      // Arrange
      const data = { nik: '1234567890123456' };
      mockUserService.isNikRegistered.mockResolvedValue(true);

      // Act
      const result = await controller.checkNikExists(data);

      // Assert
      expect(userService.isNikRegistered).toHaveBeenCalledWith(data.nik);
      expect(result).toBe(true);
    });

    it('should return false when NIK does not exist', async () => {
      // Arrange
      const data = { nik: '1234567890123456' };
      mockUserService.isNikRegistered.mockResolvedValue(false);

      // Act
      const result = await controller.checkNikExists(data);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserByNik', () => {
    it('should return user when NIK is found', async () => {
      // Arrange
      const data = { nik: '1234567890123456' };
      const expectedUser = { id: '1', nik: data.nik };
      mockUserService.findByNik.mockResolvedValue(expectedUser as any);

      // Act
      const result = await controller.getUserByNik(data);

      // Assert
      expect(userService.findByNik).toHaveBeenCalledWith(data.nik);
      expect(result).toEqual(expectedUser);
    });

    it('should throw error when NIK is not found', async () => {
      // Arrange
      const data = { nik: '1234567890123456' };
      const error = new NotFoundException('User not found');
      mockUserService.findByNik.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getUserByNik(data)).rejects.toThrow(error);
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      // Arrange
      const user = mockUser;

      // Act
      const result = await controller.getProfile(user);

      // Assert
      expect(result).toEqual(user);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      mockUserService.findAll.mockResolvedValue(mockUsers as any);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(userService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users found', async () => {
      // Arrange
      mockUserService.findAll.mockResolvedValue([]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('updateRole', () => {
    it('should update user role successfully', async () => {
      // Arrange
      const userId = '1';
      const updateRoleDto: UpdateRoleDto = { role: Role.ADMIN_FASKES };
      const updatedUser = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        role: Role.ADMIN_FASKES,
      };
      mockUserService.updateRole.mockResolvedValue(updatedUser as any);

      // Act
      const result = await controller.updateRole(userId, updateRoleDto);

      // Assert
      expect(userService.updateRole).toHaveBeenCalledWith(userId, updateRoleDto.role);
      expect(result).toEqual(updatedUser);
    });

    it('should handle user not found error', async () => {
      // Arrange
      const userId = '999';
      const updateRoleDto: UpdateRoleDto = { role: Role.ADMIN_FASKES };
      const error = new NotFoundException('User not found');
      mockUserService.updateRole.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateRole(userId, updateRoleDto)).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const userId = '1';
      const expectedResult = { message: `User with id ${userId} deleted successfully` };
      mockUserService.delete.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.delete(userId);

      // Assert
      expect(userService.delete).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedResult);
    });

    it('should handle user not found error', async () => {
      // Arrange
      const userId = '999';
      const error = new NotFoundException('User not found');
      mockUserService.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.delete(userId)).rejects.toThrow(error);
    });
  });
});
