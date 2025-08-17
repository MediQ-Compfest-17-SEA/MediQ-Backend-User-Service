import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.OPERATOR })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}