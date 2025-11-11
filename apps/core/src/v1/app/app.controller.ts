import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller({
  version: '1',
})
export class AppControllerV1 {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Welcome message (v1)' })
  @ApiResponse({
    status: 200,
    description: 'Welcome message',
    schema: {
      example: {
        message: 'Welcome to Experts Core API v1',
        version: '1.0.0',
      },
    },
  })
  getHello(): any {
    return {
      message: 'Welcome to Experts Core API v1',
      version: '1.0.0',
    };
  }
}
