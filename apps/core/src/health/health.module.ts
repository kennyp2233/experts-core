import { Module } from '@nestjs/common';
import { HealthControllerV1 } from './v1/health.controller';

@Module({
  controllers: [HealthControllerV1],
})
export class HealthModule {}
