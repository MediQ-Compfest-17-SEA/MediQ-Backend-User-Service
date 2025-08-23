import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

jest.mock('bcrypt', () => ({
  ...jest.requireActual('bcrypt'),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UserService (unit)', () => {
  let service: UserService;
  let prisma: {
    user: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UserService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new user when email/nik are unique and hashes password', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        nik: '123',
        name: 'John',
        email: 'john@example.com',
        role: Role.PASIEN,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.create({
        name: 'John',
        email: 'john@example.com',
        nik: '123',
        password: 'secret',
      } as any);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: 'john@example.com' }, { nik: '123' }] },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'hashed-password',
          }),
          select: expect.any(Object),
        }),
      );
      expect(res).toHaveProperty('id', 'u1');
    });

    it('throws ConflictException when email or nik already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'exists' });
      await expect(
        service.create({ email: 'e', nik: 'n' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('handles null password (no hashing)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u2',
        nik: '456',
        name: 'Jane',
        email: 'jane@example.com',
        role: Role.PASIEN,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create({
        name: 'Jane',
        email: 'jane@example.com',
        nik: '456',
        password: undefined as any,
      } as any);

      // Should not call bcrypt.hash when password is falsy
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('createFromOcr', () => {
    it('returns existing user if found', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u-exist', nik: '999' });
      const res = await service.createFromOcr({ nik: '999', name: 'X' });
      expect(res).toEqual({ id: 'u-exist', nik: '999' });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates new user with random password and strips password from result', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u-new',
        nik: '111',
        name: 'Y',
        email: '111@mediq.placeholder.email',
        password: 'hashed-password',
      });

      const res = await service.createFromOcr({ nik: '111', name: 'Y' });
      // Ensure hashing was attempted
      expect(bcrypt.hash).toHaveBeenCalled();

      // Ensure prisma.create was called with required fields (do not assert exact password value)
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nik: '111',
            name: 'Y',
            email: '111@mediq.placeholder.email',
          }),
        }),
      );

      // Returned result should not expose password
      expect(res).toEqual({
        id: 'u-new',
        nik: '111',
        name: 'Y',
        email: '111@mediq.placeholder.email',
      });
    });
  });

  describe('isNikRegistered', () => {
    it('returns true when found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u' });
      await expect(service.isNikRegistered('n')).resolves.toBe(true);
    });
    it('returns false when not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.isNikRegistered('n')).resolves.toBe(false);
    });
  });

  describe('findByNik', () => {
    it('returns user when found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u', nik: 'n' });
      await expect(service.findByNik('n')).resolves.toEqual({ id: 'u', nik: 'n' });
    });
    it('throws NotFoundException when not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findByNik('n')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByNikAndName', () => {
    it('returns user when nik and name match (case-insensitive)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u', name: 'JOHN' });
      await expect(service.findByNikAndName('n', 'john')).resolves.toEqual({ id: 'u', name: 'JOHN' });
    });
    it('returns null when user not found or name mismatch', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findByNikAndName('n', 'john')).resolves.toBeNull();

      prisma.user.findUnique.mockResolvedValue({ id: 'u', name: 'Alice' });
      await expect(service.findByNikAndName('n', 'john')).resolves.toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('delegates to prisma', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u', email: 'e' });
      await expect(service.findByEmail('e')).resolves.toEqual({ id: 'u', email: 'e' });
    });
  });

  describe('findAll', () => {
    it('returns list with select projection', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u' }]);
      await expect(service.findAll()).resolves.toEqual([{ id: 'u' }]);
    });
  });

  describe('updateRole', () => {
    it('updates role and returns projection', async () => {
      prisma.user.update.mockResolvedValue({ id: 'u', name: 'N', email: 'E', role: Role.ADMIN_FASKES });
      await expect(service.updateRole('u', Role.ADMIN_FASKES)).resolves.toEqual({
        id: 'u', name: 'N', email: 'E', role: Role.ADMIN_FASKES,
      });
    });
    it('throws NotFoundException when update fails', async () => {
      prisma.user.update.mockRejectedValue(new Error('not found'));
      await expect(service.updateRole('u', Role.ADMIN_FASKES)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes and returns message', async () => {
      prisma.user.delete.mockResolvedValue({});
      await expect(service.delete('u')).resolves.toEqual({ message: 'User with id u deleted successfully' });
    });
    it('throws NotFoundException when delete fails', async () => {
      prisma.user.delete.mockRejectedValue(new Error('not found'));
      await expect(service.delete('u')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getUserProfile', () => {
    it('returns profile when found', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u', email: 'e', name: 'n', nik: 'nik', role: Role.PASIEN, createdAt: new Date(), updatedAt: new Date(),
      });
      const res = await service.getUserProfile('u');
      expect(res).toHaveProperty('id', 'u');
    });
    it('throws NotFoundException when not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});