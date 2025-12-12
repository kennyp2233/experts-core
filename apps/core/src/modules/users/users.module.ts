import { Module } from '@nestjs/common';
import { UsersService } from './v1/users.service';
import { UsersController } from './v1/users.controller';

@Module({
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }
