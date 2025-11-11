import { Module } from '@nestjs/common';
import { UsersService } from './v1/users.service';
import { UsersController } from './v1/users.controller';
import { PrismaClient } from '.prisma/usuarios-client';

@Module({
  providers: [
    UsersService,
    { provide: 'PrismaClientUsuarios', useClass: PrismaClient },
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
