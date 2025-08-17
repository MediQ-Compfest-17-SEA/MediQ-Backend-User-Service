import { Controller, Post, Body, Get, Param, UseGuards, Patch, Delete, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from 'src/auth/dto/update-role.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { EventPattern, Payload } from '@nestjs/microservices';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Endpoint untuk mendaftarkan pengguna baru.
   * Menerima data pengguna baru, melakukan validasi, dan menyimpan ke database.
   */
  @Post()
  @ApiOperation({ summary: 'Mendaftarkan pengguna baru' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  /**
   * Event handler untuk membuat pengguna baru dari data OCR.
   * Menerima data NIK dan nama dari antrian pesan.
   */
  @EventPattern('user_register_ocr')
  async handleUserRegisterFromOcr(@Payload() data: { nik: string; name: string }) {
    try {
      await this.userService.createFromOcr(data);
    } catch (error) {
      console.error('Failed to create user from OCR:', error);
    }
  }
  /**
   * Endpoint untuk mengecek apakah NIK sudah terdaftar.
   * Mengembalikan 204 No Content jika NIK sudah ada, atau 404 Not Found jika belum terdaftar.
   */
  @Get('check-nik/:nik')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mengecek NIK (hanya mengembalikan boolean)' })
  @ApiResponse({ status: 204, description: 'NIK sudah terdaftar.' })
  @ApiResponse({ status: 404, description: 'NIK belum terdaftar.' })
  async checkNik(@Param('nik') nik: string) {
    const isRegistered = await this.userService.isNikRegistered(nik);
    if (!isRegistered) {
      throw new NotFoundException(`User dengan NIK tersebut tidak ditemukan`);
    }
    return;
  }

  /**
   * Endpoint untuk mendapatkan profil pengguna yang sedang login.
   * Menggunakan decorator @CurrentUser untuk mendapatkan data pengguna dari token JWT.
   */
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan profil pengguna yang sedang login' })
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  /**
   * Endpoint untuk mendapatkan semua pengguna (hanya untuk admin).
   * Menggunakan guard RolesGuard untuk memastikan hanya admin yang dapat mengakses.
   */
  @Get()
  @Roles(Role.ADMIN_FASKES)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua pengguna (Hanya Admin)' })
  findAll() {
    return this.userService.findAll();
  }

  /**
   * Endpoint untuk mendapatkan pengguna berdasarkan ID (hanya untuk admin).
   * Menggunakan guard RolesGuard untuk memastikan hanya admin yang dapat mengakses.
   */
  @Patch(':id/role')
  @Roles(Role.ADMIN_FASKES)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengubah peran pengguna (Hanya Admin)' })
  updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.userService.updateRole(id, updateRoleDto.role);
  }
  
  /**
   * Endpoint untuk menghapus pengguna berdasarkan ID (hanya untuk admin).
   * Menggunakan guard RolesGuard untuk memastikan hanya admin yang dapat mengakses.
   */
  @Delete(':id')
  @Roles(Role.ADMIN_FASKES)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Menghapus pengguna (Hanya Admin)' })
  delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}