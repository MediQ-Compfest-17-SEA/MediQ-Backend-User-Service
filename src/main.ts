import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
