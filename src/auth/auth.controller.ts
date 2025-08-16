import { Controller, Post, Body, UnauthorizedException, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login pengguna' })
  @ApiResponse({ status: 200, description: 'Login berhasil, mengembalikan access dan refresh token.'})
  @ApiResponse({ status: 401, description: 'Kredensial tidak valid.'})
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Kredensial tidak valid.');
    }
    return this.authService.login(user);
  }

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