import 'reflect-metadata';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

function createContext(user: any, handlerMeta?: Role[], classMeta?: Role[]): ExecutionContext {
  const req = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getClass: () => (classMeta ? { name: 'TestClass' } : ({} as any)),
    getHandler: () => (handlerMeta ? (() => null) as any : ({} as any)),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http',
  } as any;
}

describe('RolesGuard behavior', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    // Mock Reflector to return metadata for handler/class
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  it('allows access when no required roles metadata present', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const ctx = createContext({ role: Role.PASIEN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user role matches one of required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.ADMIN_FASKES, Role.OPERATOR]);
    const ctx = createContext({ role: Role.ADMIN_FASKES });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when user role does not match required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.ADMIN_FASKES, Role.OPERATOR]);
    const ctx = createContext({ role: Role.PASIEN });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('denies access when user role is missing (optional chaining false branch)', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.ADMIN_FASKES]);
    const ctx = createContext({}); // user.role is undefined
    expect(guard.canActivate(ctx)).toBe(false);
  });
});