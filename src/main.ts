import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>('RABBITMQ_URL')],
      queue: 'user_service_queue',
      queueOptions: {
        durable: false,
      },
    },
  });

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('MediQ User Service')
    .setDescription('Advanced mikroservice untuk manajemen pengguna dengan dukungan data KTP lengkap dari OCR. Terintegrasi dengan Gemini AI OCR Engine untuk registrasi otomatis dan real-time notifications.')
    .setVersion('3.0')
    .addTag('users', 'User management dengan data KTP lengkap - Registrasi, profil, CRUD operations')
    .addTag('auth', 'Authentication dan authorization dengan JWT tokens - Login, refresh, role management')
    .addTag('health', 'Health check dan monitoring service - Status dan availability')
    .addBearerAuth()
    .setContact(
      'MediQ Support',
      'https://mediq.craftthingy.com',
      'support@mediq.com'
    )
    .setLicense(
      'MIT',
      'https://opensource.org/licenses/MIT'
    )
    .addServer('http://localhost:8602', 'Development Server')
    .addServer('https://mediq-user-service.craftthingy.com', 'Production Server')
    .setExternalDoc('MediQ Documentation', 'https://mediq.craftthingy.com/docs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.startAllMicroservices();
  const port = configService.get<number>('PORT') ?? 8602;
  await app.listen(port);

  console.log(`User service is listening on port ${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  console.log(`Microservice is listening for RabbitMQ messages`);
}
bootstrap();
