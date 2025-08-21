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
    .setDescription('Mikroservice untuk manajemen pengguna dengan dukungan data KTP lengkap dari OCR')
    .setVersion('2.0')
    .addTag('users', 'Operasi manajemen pengguna dengan data KTP lengkap')
    .addTag('auth', 'Autentikasi dan otorisasi dengan JWT tokens')
    .addTag('health', 'Health check dan monitoring service')
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
