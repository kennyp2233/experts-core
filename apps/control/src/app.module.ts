import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { WorkersModule } from './modules/workers/workers.module';
import { DepotsModule } from './modules/depots/depots.module';
import { WorkerAuthModule } from './modules/worker-auth/worker-auth.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AuthModule, WorkersModule, DepotsModule, WorkerAuthModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
