import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health.controller.js';
import { MeController } from './me/me.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RoomsModule } from './rooms/rooms.module.js';

@Module({
  imports: [PrismaModule, AuthModule, RoomsModule],
  controllers: [HealthController, MeController],
})
export class AppModule {}
