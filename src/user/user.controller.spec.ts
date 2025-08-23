import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    // UBAH MOCK INI UNTUK MENGEMBALIKAN PROMISE
    create: jest.fn(dto => {
      return Promise.resolve({
        id: 'some-uuid',
        ...dto,
      });
    }),
    findAll: jest.fn(() => Promise.resolve(['user1', 'user2'])),
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const dto = { name: 'Test User', email: 'test@example.com', password: 'password', nik: '12345' };
    
    await controller.create(dto);
    expect(mockUserService.create).toHaveBeenCalledWith(dto);
  });
});