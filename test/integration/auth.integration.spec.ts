import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockPrisma } from '../mocks/database.mock';

describe('Auth Integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/auth/login/admin (POST)', () => {
    it('should login admin successfully', async () => {
      // Arrange
      const adminUser = {
        id: '1',
        email: 'admin@example.com',
        password: '$2b$10$hashedPassword',
        role: 'ADMIN_FASKES',
      };
      
      (prismaService as any).user.findUnique.mockResolvedValue(adminUser);
      (prismaService as any).user.update.mockResolvedValue({
        ...adminUser,
        hashedRefreshToken: 'hashedRefreshToken',
      });

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login/admin')
        .send({
          email: 'admin@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid credentials', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/login/admin')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should validate request body', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login/admin')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(400);

      expect(response.body.message).toContain('email must be an email');
    });
  });

  describe('/auth/login/user (POST)', () => {
    it('should login user successfully with NIK and name', async () => {
      // Arrange
      const user = {
        id: '2',
        nik: '1234567890123456',
        name: 'John Doe',
        role: 'PASIEN',
      };
      
      (prismaService as any).user.findUnique.mockResolvedValue(user);
      (prismaService as any).user.update.mockResolvedValue({
        ...user,
        hashedRefreshToken: 'hashedRefreshToken',
      });

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login/user')
        .send({
          nik: '1234567890123456',
          name: 'John Doe',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid NIK format', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login/user')
        .send({
          nik: '123456789012345', // 15 digits
          name: 'John Doe',
        })
        .expect(400);

      expect(response.body.message).toContain('nik must be exactly 16 characters');
    });
  });
});
