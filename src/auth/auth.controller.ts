import { Controller, Post, Body, UnauthorizedException, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UserLoginDto } from './dto/user-login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Endpoint untuk login Admin dengan email dan password.
   */
  @Post('login/admin')
  @ApiOperation({ summary: 'Login untuk Admin/Operator' })
  @ApiResponse({ status: 200, description: 'Login berhasil, mengembalikan access dan refresh token.'})
  @ApiResponse({ status: 401, description: 'Kredensial tidak valid.'})
  async login(@Body() AdminLoginDto: AdminLoginDto) {
    const user = await this.authService.validateAdmin(
      AdminLoginDto.email,
      AdminLoginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Kredensial tidak valid.');
    }
    return this.authService.login(user);
  }

  /**
   * Endpoint untuk login pengguna dengan NIK dan nama.
   * Menerima NIK dan nama, memvalidasi pengguna, dan mengembalikan access token dan refresh token.
   */
  @Post('login/user')
  @ApiOperation({ summary: 'Login untuk User/Pasien via NIK & Nama' })
  @ApiResponse({ status: 200, description: 'Login berhasil, mengembalikan access dan refresh token.'})
  @ApiResponse({ status: 401, description: 'Pengguna dengan NIK dan Nama tersebut tidak ditemukan.'})
  async loginUser(@Body() userLoginDto: UserLoginDto) {
    return this.authService.loginUser(userLoginDto.nik, userLoginDto.name);
  }

  /**
   * Endpoint untuk memperbarui access token menggunakan refresh token.
   * Hanya pengguna yang sudah login yang dapat mengakses endpoint ini.
   */
  @UseGuards(AuthGuard('jwt-refresh'))
  @Get('refresh')
  @ApiOperation({ summary: 'Memperbarui access token' })
  refreshTokens(@Request() req) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout pengguna' })
  @Get('logout')
  logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }
}