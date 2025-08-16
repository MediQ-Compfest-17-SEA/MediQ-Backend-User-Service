// src/user/user.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      // ✅ FIX: Add findFirst to the mock object
      findFirst: jest.fn().mockResolvedValue(null), 
      create: jest.fn().mockImplementation(dto => Promise.resolve({ id: 'some-uuid', ...dto.data })),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a new user', async () => {
    const userDto = {
      email: 'test@example.com',
      password: 'password123', // Kita gunakan password mentah, karena service yang akan hash
      name: 'Test User',
      nik: '1234567890',
    };

    await service.create(userDto);
    
    // Expect that create was called since findFirst returned null
        expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: userDto.email,
        name: userDto.name,
        nik: userDto.nik,
        // Gunakan expect.any(String) untuk password karena kita tidak tahu hasil hash-nya
        password: expect.any(String), 
        // role tidak disertakan karena service Anda tidak menyertakannya
      },
      // Sertakan juga `select` clause yang digunakan oleh service Anda
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

    const calledWithData = mockPrismaService.user.create.mock.calls[0][0].data;
    expect(calledWithData.password).not.toEqual(userDto.password);
  });
});