import { Controller, Post, Body, Get, Param, UseGuards, Request, Patch, Delete, HttpCode, NotFoundException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Role } from '@prisma/client';
import { UpdateRoleDto } from 'src/auth/dto/update-role.dto';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Mendaftarkan pengguna baru' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('check-nik/:nik')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mengecek NIK yang sudah terdaftar' })  
  async checkNik(@Param('nik') nik: string) {
    const isRegistered = await this.userService.isNikRegistered(nik);
    if (!isRegistered) {
      throw new NotFoundException ('User dengan NIK tersebut tidak ditemukan');
    }
    return;
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Mendapatkan profil pengguna yang sedang login' })
  getProfile(@Request() req) {
    return req.user;
  }

  @Get()
  @Roles(Role.ADMIN_FASKES)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua pengguna (Hanya Admin)' })
  findAll() {
    return this.userService.findAll();
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN_FASKES)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengubah peran pengguna (Hanya Admin)' })
  updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.userService.updateRole(id, updateRoleDto.role);
  }
  
  @Delete(':id')
  @Roles(Role.ADMIN_FASKES)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Menghapus pengguna (Hanya Admin)' })
  delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}
