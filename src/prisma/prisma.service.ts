import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected successfully.');
    await this.seedAdminIfNeeded();
  }

  private async seedAdminIfNeeded(): Promise<void> {
    try {
      const adminEmail =
        this.configService.get<string>('ADMIN_EMAIL') || 'admin@mediq.com';
      const adminPassword =
        this.configService.get<string>('ADMIN_PASSWORD') || 'admin123';
      const adminName =
        this.configService.get<string>('ADMIN_NAME') || 'Administrator';

      // Allow disabling admin seeding explicitly via env
      const disableSeed =
        this.configService.get<string>('DISABLE_ADMIN_SEED') === 'true';
      if (disableSeed) {
        console.log('[PrismaService] Admin seeding disabled via DISABLE_ADMIN_SEED=true');
        return;
      }

      const existing = await this.user.findFirst({
        where: { email: adminEmail },
      });

      if (existing) {
        // Ensure admin role is correct
        if (existing.role !== Role.ADMIN_FASKES) {
          await this.user.update({
            where: { id: existing.id },
            data: { role: Role.ADMIN_FASKES },
          });
          console.log(
            `[PrismaService] Ensured admin role for ${adminEmail} is ADMIN_FASKES`,
          );
        }
        return;
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create a minimal-but-valid admin user record
      await this.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          nik: `ADM-${Date.now()}`, // placeholder unique NIK for admin
          password: hashedPassword,
          role: Role.ADMIN_FASKES,
        },
      });

      console.log(
        `[PrismaService] Seeded default admin user: ${adminEmail} (role: ADMIN_FASKES)`,
      );
    } catch (err: any) {
      console.error('[PrismaService] Failed to seed admin user:', err?.message);
    }
  }
}