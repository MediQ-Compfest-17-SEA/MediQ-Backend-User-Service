import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';

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
}
