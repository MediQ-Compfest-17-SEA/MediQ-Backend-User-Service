import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: '3204123456780001', description: 'Nomor Induk Kependudukan' })
  @IsString()
  @IsNotEmpty()
  nik: string;

  @ApiProperty({ example: 'John Doe', description: 'Nama lengkap pengguna' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'JohnDoe@Example.com' , description: 'Email pengguna unik' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'password123', description: 'Password pengguna, minimal 6 karakter' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsOptional()
  password?: string;

  // KTP Data Fields
  @ApiPropertyOptional({ example: 'JAKARTA', description: 'Tempat lahir sesuai KTP' })
  @IsString()
  @IsOptional()
  tempat_lahir?: string;

  @ApiPropertyOptional({ example: '15-08-1990', description: 'Tanggal lahir dalam format DD-MM-YYYY' })
  @IsString()
  @IsOptional()
  tgl_lahir?: string;

  @ApiPropertyOptional({ example: 'LAKI-LAKI', description: 'Jenis kelamin' })
  @IsString()
  @IsOptional()
  jenis_kelamin?: string;

  @ApiPropertyOptional({ example: 'JL. MENTENG RAYA NO. 123', description: 'Alamat jalan lengkap' })
  @IsString()
  @IsOptional()
  alamat_jalan?: string;

  @ApiPropertyOptional({ example: 'KELURAHAN MENTENG', description: 'Kelurahan/Desa' })
  @IsString()
  @IsOptional()
  alamat_kel_desa?: string;

  @ApiPropertyOptional({ example: 'MENTENG', description: 'Kecamatan' })
  @IsString()
  @IsOptional()
  alamat_kecamatan?: string;

  @ApiPropertyOptional({ example: '001/002', description: 'RT/RW' })
  @IsString()
  @IsOptional()
  alamat_rt_rw?: string;

  @ApiPropertyOptional({ example: 'ISLAM', description: 'Agama' })
  @IsString()
  @IsOptional()
  agama?: string;

  @ApiPropertyOptional({ example: 'BELUM KAWIN', description: 'Status perkawinan' })
  @IsString()
  @IsOptional()
  status_perkawinan?: string;

  @ApiPropertyOptional({ example: 'KARYAWAN SWASTA', description: 'Pekerjaan' })
  @IsString()
  @IsOptional()
  pekerjaan?: string;

  @ApiPropertyOptional({ example: 'WNI', description: 'Kewarganegaraan' })
  @IsString()
  @IsOptional()
  kewarganegaraan?: string;

  @ApiPropertyOptional({ example: 'SEUMUR HIDUP', description: 'Masa berlaku KTP' })
  @IsString()
  @IsOptional()
  berlaku_hingga?: string;
}