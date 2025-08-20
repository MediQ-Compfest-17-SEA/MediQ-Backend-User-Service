import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Role } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const createMockExecutionContext = (user: any): ExecutionContext => ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any);

    it('should return true when no roles are required', () => {
      // Arrange
      const context = createMockExecutionContext({ role: Role.PASIEN });
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true when user has required role', () => {
      // Arrange
      const user = { role: Role.ADMIN_FASKES };
      const context = createMockExecutionContext(user);
      const requiredRoles = [Role.ADMIN_FASKES];
      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      // Arrange
      const user = { role: Role.OPERATOR };
      const context = createMockExecutionContext(user);
      const requiredRoles = [Role.ADMIN_FASKES, Role.OPERATOR];
      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      // Arrange
      const user = { role: Role.PASIEN };
      const context = createMockExecutionContext(user);
      const requiredRoles = [Role.ADMIN_FASKES];
      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user is undefined', () => {
      // Arrange
      const context = createMockExecutionContext(undefined);
      const requiredRoles = [Role.ADMIN_FASKES];
      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user has no role', () => {
      // Arrange
      const user = {};
      const context = createMockExecutionContext(user);
      const requiredRoles = [Role.ADMIN_FASKES];
      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when required roles is empty array', () => {
      // Arrange
      const user = { role: Role.ADMIN_FASKES };
      const context = createMockExecutionContext(user);
      const requiredRoles: Role[] = [];
      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });
  });
});
