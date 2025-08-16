import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    create: jest.fn(dto => {
      return {
        id: 'some-uuid',
        ...dto,
      };
    }),
    findAll: jest.fn(() => ['user1', 'user2']),
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
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const dto = { name: 'Test User', email: 'test@example.com', password: 'password', nik: '12345' };
    expect(await controller.create(dto)).toEqual({
      id: 'some-uuid',
      ...dto,
    });
    expect(mockUserService.create).toHaveBeenCalledWith(dto);
  });
});