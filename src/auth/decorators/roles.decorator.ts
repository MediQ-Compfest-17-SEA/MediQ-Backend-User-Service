import { SetMetadata } from "@nestjs/common";
import { Role } from '@prisma/client';

/**
 * Custom decorator @Roles untuk menetapkan peran yang diperlukan untuk akses endpoint tertentu.
 * Digunakan bersama dengan RolesGuard untuk memvalidasi peran pengguna.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);