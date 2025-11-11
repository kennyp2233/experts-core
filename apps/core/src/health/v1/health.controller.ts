import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller({
  path: 'health',
  version: '1',
})
export class HealthControllerV1 {
  @Get()
  @ApiOperation({ summary: 'Check application health status (v1)' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2025-11-10T10:30:00.000Z',
        uptime: 3600,
      },
    },
  })
  checkHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
