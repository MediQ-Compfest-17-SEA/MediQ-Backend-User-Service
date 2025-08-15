import { Role } from "@prisma/client";
import { IsEnum, IsNotEmpty } from "class-validator";

export class UpdateRoleDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}