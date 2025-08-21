import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Memvalidasi pengguna berdasarkan email dan password.
   * Menggunakan bcrypt untuk membandingkan password yang di-hash.
   */
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Memvalidasi admin berdasarkan email dan password.
   * Hanya admin yang dapat login menggunakan endpoint ini.
   */
  async validateAdmin(email: string, pass: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && user.password && (await bcrypt.compare(pass, user.password)) && user.role !== Role.PASIEN) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Memvalidasi pengguna berdasarkan NIK dan nama.
   * Digunakan untuk login pengguna dengan NIK.
   */
  async loginUser(nik: string, name: string): Promise<any> {
    const user = await this.userService.findByNikAndName(nik, name);
    if (!user) {
      throw new UnauthorizedException('Pengguna dengan NIK dan Nama tersebut tidak ditemukan.');
    }
    return this.login(user);
  }

  /**
   * Menghasilkan token akses dan refresh token untuk pengguna yang berhasil login.
   * Token akses memiliki masa berlaku pendek, sedangkan refresh token lebih lama.
   */
  async login(user: any) {
    const accessTokenPayload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(accessTokenPayload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    }); 
    
    const refreshTokenPayload = { sub: user.id };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    await this.updateRefreshTokenHash(user.id, refreshToken);
    return { accessToken, refreshToken };
  }

  /**
   * Menghapus refresh token dari pengguna saat logout.
   * Ini akan mencegah penggunaan refresh token yang sudah tidak valid.
   */
  async logout(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }

  /**
   * Memperbarui token akses menggunakan refresh token.
   * Memastikan refresh token yang diberikan cocok dengan yang tersimpan di database.
   */
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Akses Ditolak');
    }

    const isTokenMatching = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!isTokenMatching) {
      throw new UnauthorizedException('Akses Ditolak');
    }

    const accessTokenPayload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(accessTokenPayload);
    return { accessToken };
  }
  
  /**
   * Mengupdate hash refresh token pengguna di database.
   * Digunakan saat pengguna login untuk menyimpan refresh token yang baru.
   */
  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }
}