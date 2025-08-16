import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Membuat pengguna baru dengan validasi email dan NIK.
   * Menggunakan bcrypt untuk meng-hash password sebelum disimpan.
   */
  async create(createUserDto: CreateUserDto) {
    const { email, nik, password, name } = createUserDto;

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { nik }] },
    });

    if (existingUser) {
      throw new ConflictException('Email or NIK is already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        name,
        email,
        nik,
        password: hashedPassword,
      },
      select: {
        id: true,
        nik: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return newUser;
  }

  /**
   * Mengecek apakah NIK sudah terdaftar.
   * Mengembalikan true jika NIK sudah ada, false jika tidak.
   */
  async isNikRegistered(nik: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { nik },
      select: { id: true },
    });
    return !!user;
  } 

  /**
   * Mencari pengguna berdasarkan NIK.
   * Mengembalikan pengguna jika ditemukan, atau melempar NotFoundException jika tidak ada.
   */
  async findByNik(nik: string) {
    const user = await this.prisma.user.findUnique({
      where: { nik },
      select: {
        id: true,
        nik: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with NIK ${nik} not found.`);
    }
    return user;
  }

  /**
   * Mencari pengguna berdasarkan email.
   * Mengembalikan pengguna jika ditemukan, atau null jika tidak ada.
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }});
  }

  /**
   * Mengambil semua pengguna.
   * Mengembalikan daftar pengguna dengan informasi dasar.
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        nik: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  /**
   * Mengubah peran pengguna berdasarkan ID.
   * Mengembalikan pengguna yang telah diperbarui.
   */
  async updateRole(userId: string, role: Role) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
      return updatedUser;
    } catch (error) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
  }

  /**
   * Menghapus pengguna berdasarkan ID.
   * Mengembalikan pesan sukses jika berhasil, atau melempar NotFoundException jika tidak ditemukan.
   */
  async delete(userId: string) {
    try {
      await this.prisma.user.delete({
        where: { id: userId },
      });
      return { message: `User with id ${userId} deleted successfully` };
    } catch (error) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
  }

    /**
   * Mengambil profil pengguna berdasarkan ID.
   */
  async getUserProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return user;
  }
}
