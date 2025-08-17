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
    .setDescription('API documentation for the MediQ User Service')
    .setVersion('1.0')
    .addTag('users', 'Operations related to users')
    .addTag('auth', 'Authentication and authorization operations')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.startAllMicroservices();
  await app.listen(configService.get<number>('PORT') ?? 3000)

  console.log(`User service is listening on port ${configService.get('PORT')}`);
  console.log(`Microservice is listening for RabbitMQ messages`);
}
bootstrap();
