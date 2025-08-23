import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';

describe('UserController (additional coverage)', () => {
  let controller: UserController;

  const mockUserService = {
    create: jest.fn(),
    createFromOcr: jest.fn(),
    isNikRegistered: jest.fn(),
    findByNik: jest.fn(),
    findByNikAndName: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    updateRole: jest.fn(),
    delete: jest.fn(),
    getUserProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(UserController);
  });

  it('checkNik returns 204 (no content) when NIK is registered', async () => {
    mockUserService.isNikRegistered.mockResolvedValue(true);
    await expect(controller.checkNik('123')).resolves.toBeUndefined();
    expect(mockUserService.isNikRegistered).toHaveBeenCalledWith('123');
  });

  it('checkNik throws NotFoundException when NIK is not registered', async () => {
    mockUserService.isNikRegistered.mockResolvedValue(false);
    await expect(controller.checkNik('notfound')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checkNikExists message pattern delegates to service', async () => {
    mockUserService.isNikRegistered.mockResolvedValue(true);
    const res = await controller.checkNikExists({ nik: 'abc' } as any);
    expect(res).toBe(true);
  });

  it('getUserByNik message pattern delegates to service', async () => {
    mockUserService.findByNik.mockResolvedValue({ id: 'u1', nik: '123' });
    const res = await controller.getUserByNik({ nik: '123' } as any);
    expect(res).toEqual({ id: 'u1', nik: '123' });
  });

  it('findAll returns list from service (guards bypassed)', async () => {
    mockUserService.findAll.mockResolvedValue([{ id: 'u1' }]);
    const res = await controller.findAll();
    expect(res).toEqual([{ id: 'u1' }]);
  });

  it('updateRole delegates to service', async () => {
    mockUserService.updateRole.mockResolvedValue({ id: 'u2', role: 'ADMIN_FASKES' });
    const res = await controller.updateRole('u2', { role: 'ADMIN_FASKES' } as any);
    expect(mockUserService.updateRole).toHaveBeenCalledWith('u2', 'ADMIN_FASKES');
    expect(res).toEqual({ id: 'u2', role: 'ADMIN_FASKES' });
  });

  it('delete delegates to service', async () => {
    mockUserService.delete.mockResolvedValue({ message: 'ok' });
    const res = await controller.delete('del-1');
    expect(res).toEqual({ message: 'ok' });
  });

  it('getByIdMessage delegates to service', async () => {
    mockUserService.getUserProfile.mockResolvedValue({ id: 'u3' });
    const res = await controller.getByIdMessage({ id: 'u3' } as any);
    expect(res).toEqual({ id: 'u3' });
  });

  it('getByIdGrpc maps Date fields to ISO strings', async () => {
    const now = new Date('2025-01-01T10:00:00.000Z');
    mockUserService.getUserProfile.mockResolvedValue({
      id: 'u4',
      email: 'e',
      name: 'n',
      nik: 'nik',
      role: 'PASIEN',
      createdAt: now,
      updatedAt: now,
    });
    const res = await controller.getByIdGrpc({ id: 'u4' } as any);
    expect(res).toEqual({
      id: 'u4',
      email: 'e',
      name: 'n',
      nik: 'nik',
      role: 'PASIEN',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('getByIdHttp delegates to service', async () => {
    mockUserService.getUserProfile.mockResolvedValue({ id: 'u5' });
    const res = await controller.getByIdHttp('u5');
    expect(res).toEqual({ id: 'u5' });
  });
});