import { Controller, Post, Body, Get, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Role } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('check-nik/:nik')
  findByNik(@Param('nik') nik: string) {
    return this.userService.findByNik(nik);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Get()
  @Roles(Role.ADMIN_FASKES)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  findAll() {
    return this.userService.findAll();
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN_FASKES)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}
