import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

export const mockPrisma = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(mockPrisma);
});

export type MockPrisma = DeepMockProxy<PrismaClient>;

// Mock users data
export const mockUsers = [
  {
    id: '1',
    nama: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword',
    role: 'PASIEN',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    nama: 'Admin User',
    email: 'admin@example.com',
    password: 'hashedPassword',
    role: 'ADMIN_FASKES',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockCreateUserData = {
  nama: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
  role: 'PASIEN',
};

export const mockUser = mockUsers[0];
export const mockAdminUser = mockUsers[1];
