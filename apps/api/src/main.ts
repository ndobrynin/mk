import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module.js';

const WEB_CORS_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173'];

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: WEB_CORS_ORIGINS });
  app.useWebSocketAdapter(new IoAdapter(app));
  const port = process.env.PORT ?? 4010;
  await app.listen(port);
}

void bootstrap();
