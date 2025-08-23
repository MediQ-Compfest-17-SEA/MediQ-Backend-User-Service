import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';

describe('PrismaService (onModuleInit + seeding)', () => {
  let service: PrismaService;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'ADMIN_EMAIL') return 'admin@mediq.com';
        if (key === 'ADMIN_PASSWORD') return 'secret';
        if (key === 'ADMIN_NAME') return 'Admin';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(PrismaService);

    // Prevent real DB connections
    jest.spyOn(service as any, '$connect').mockResolvedValue(undefined as any);
  });

  it('connects and seeds admin if not exists', async () => {
    const mockedUser = {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'admin-id' }),
      update: jest.fn(),
    };
    // Override Prisma client user delegate
    (service as any).user = mockedUser;

    await service.onModuleInit();

    expect((service as any).$connect).toHaveBeenCalled();
    expect(mockedUser.findFirst).toHaveBeenCalledWith({ where: { email: 'admin@mediq.com' } });
    // create is called because admin not found
    expect(mockedUser.create).toHaveBeenCalled();
  });

  it('ensures role is updated when existing admin has wrong role', async () => {
    const mockedUser = {
      findFirst: jest.fn().mockResolvedValue({ id: 'admin-id', role: 'PASIEN' }),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    };
    (service as any).user = mockedUser;

    await service.onModuleInit();

    expect(mockedUser.update).toHaveBeenCalledWith({
      where: { id: 'admin-id' },
      data: { role: expect.any(String) },
    });
    // Should not create
    expect(mockedUser.create).not.toHaveBeenCalled();
  });

  it('uses default credentials when ADMIN_* not provided and proceeds to seed', async () => {
    // When config returns falsy, PrismaService falls back to defaults via "||"
    config.get.mockImplementation((key: string) => {
      if (key === 'ADMIN_EMAIL') return undefined;
      if (key === 'ADMIN_PASSWORD') return undefined;
      if (key === 'ADMIN_NAME') return undefined;
      return undefined;
    });

    const mockedUser = {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'seeded-admin' }),
      update: jest.fn(),
    };
    (service as any).user = mockedUser;

    await service.onModuleInit();

    // Should proceed with seeding using default values
    expect(mockedUser.findFirst).toHaveBeenCalledWith({ where: { email: 'admin@mediq.com' } });
    expect(mockedUser.create).toHaveBeenCalled();
    expect(mockedUser.update).not.toHaveBeenCalled();
  });
});
describe('PrismaService DISABLE_ADMIN_SEED branch', () => {
  let service: PrismaService;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'ADMIN_EMAIL') return 'admin@mediq.com';
        if (key === 'ADMIN_PASSWORD') return 'secret';
        if (key === 'ADMIN_NAME') return 'Admin';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(PrismaService);
    jest.spyOn(service as any, '$connect').mockResolvedValue(undefined as any);
  });

  it('skips seeding when DISABLE_ADMIN_SEED=true', async () => {
    // Enable the new short-circuit branch
    config.get.mockImplementation((key: string) => {
      if (key === 'DISABLE_ADMIN_SEED') return 'true';
      if (key === 'ADMIN_EMAIL') return 'admin@mediq.com';
      if (key === 'ADMIN_PASSWORD') return 'secret';
      if (key === 'ADMIN_NAME') return 'Admin';
      return undefined;
    });

    const mockedUser = {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    (service as any).user = mockedUser;

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await service.onModuleInit();

    expect(mockedUser.findFirst).not.toHaveBeenCalled();
    expect(mockedUser.create).not.toHaveBeenCalled();
    expect(mockedUser.update).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[PrismaService] Admin seeding disabled via DISABLE_ADMIN_SEED=true');
    logSpy.mockRestore();
  });
});