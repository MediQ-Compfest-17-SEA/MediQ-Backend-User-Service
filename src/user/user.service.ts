import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

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

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }});
  }
}