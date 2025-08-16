import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserService } from '../src/user/user.service';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let service: UserService;

  const mockPrismaService = {
    user: {
      create: jest.fn().mockResolvedValue({ id: 'some-uuid', email: 'test@example.com' }),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

    beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        // Beritahu Nest untuk menggunakan mock object saat PrismaService dibutuhkan
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Contoh tes yang menggunakan mock
  it('should create a user', async () => {
    const dto = { email: 'test@example.com', name: 'Test', password: 'password' };
    await service.create(dto);
    // Cek apakah fungsi create di mock prisma dipanggil
    expect(prisma.user.create).toHaveBeenCalledWith({ data: dto });
  });

  // -- SETUP --
  // Fungsi ini berjalan sekali sebelum semua tes dimulai
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Pastikan ValidationPipe juga aktif di lingkungan tes
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Dapatkan instance PrismaService untuk membersihkan database
    prisma = app.get<PrismaService>(PrismaService);
  });

  // Fungsi ini berjalan sebelum SETIAP tes dimulai
  beforeEach(async () => {
    // Bersihkan database untuk memastikan tes terisolasi
    await prisma.user.deleteMany({});
  });

  // Fungsi ini berjalan sekali setelah semua tes selesai
  afterAll(async () => {
    await app.close();
  });

  // --- TES REGISTRASI ---
  describe('/users (POST)', () => {
    it('should register a new user successfully', () => {
      const dto = {
        nik: '3204123456780001',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(dto)
        .expect(201)
        .then((res) => {
          // Pastikan respons sesuai harapan
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toEqual(dto.email);
          // Pastikan password tidak dikembalikan
          expect(res.body.password).toBeUndefined();
        });
    });

    it('should fail to register with a duplicate email', async () => {
      const dto = {
        nik: '3204123456780002',
        name: 'Another User',
        email: 'duplicate@example.com',
        password: 'password123',
      };
      
      // Daftarkan user pertama kali
      await request(app.getHttpServer()).post('/users').send(dto);

      // Coba daftarkan lagi dengan email yang sama
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...dto, nik: '3204123456780003' }) // NIK beda, email sama
        .expect(409); // Expect Conflict
    });
  });

  // --- TES LOGIN ---
  describe('/auth/login (POST)', () => {
    it('should login the user and return an access_token', async () => {
      const userCredentials = {
        email: 'login.test@example.com',
        password: 'password123',
      };

      // 1. Daftarkan user terlebih dahulu
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Login User',
          nik: '3204123456780004',
          ...userCredentials,
        });

      // 2. Coba login
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(userCredentials)
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail to login with wrong password', async () => {
        const userCredentials = {
          email: 'wrongpass.test@example.com',
          password: 'password123',
        };
  
        // 1. Daftarkan user
        await request(app.getHttpServer())
          .post('/users')
          .send({
            name: 'Wrong Pass User',
            nik: '3204123456780005',
            ...userCredentials,
          });
  
        // 2. Coba login dengan password salah
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: userCredentials.email, password: 'wrongpassword' })
          .expect(401); // Expect Unauthorized
      });
  });
});