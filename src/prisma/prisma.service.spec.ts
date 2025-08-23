import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Prevent real DB connections during unit test
    jest.spyOn(service, '$connect' as any).mockResolvedValue(undefined as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
