import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';

@Module({
  controllers: [MediaController],
  providers: [],
  exports: [],
})
export class MediaModule {}
