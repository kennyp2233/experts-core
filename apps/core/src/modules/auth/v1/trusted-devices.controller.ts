import {
  Controller,
  Get,
  Delete,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@ApiTags('Trusted Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'auth/devices',
  version: '1',
})
export class TrustedDevicesController {
  constructor(private authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los dispositivos confiables del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de dispositivos confiables',
    schema: {
      example: {
        devices: [
          {
            id: 'cm3hj9k8l0000xjke8bqf5z9m',
            deviceName: 'iPhone 13',
            browser: 'Chrome',
            os: 'iOS 16',
            deviceType: 'mobile',
            lastUsedAt: '2025-11-16T12:00:00.000Z',
            lastIpAddress: '192.168.1.1',
            expiresAt: '2025-12-16T12:00:00.000Z',
            createdAt: '2025-11-01T12:00:00.000Z',
          },
        ],
      },
    },
  })
  async listMyDevices(@Request() req: any) {
    const userId = req.user.userId;
    const devices = await this.authService.getTrustedDevices(userId);

    return { devices };
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un dispositivo confiable específico' })
  @ApiResponse({
    status: 200,
    description: 'Dispositivo eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Dispositivo no encontrado',
  })
  async removeDevice(@Request() req: any, @Param('deviceId') deviceId: string) {
    const userId = req.user.userId;

    const removed = await this.authService.removeTrustedDevice(userId, deviceId);

    if (!removed) {
      throw new NotFoundException('Dispositivo no encontrado');
    }

    return {
      success: true,
      message: 'Dispositivo eliminado exitosamente',
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar TODOS los dispositivos confiables' })
  @ApiResponse({
    status: 200,
    description: 'Todos los dispositivos eliminados exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Todos los dispositivos eliminados',
        count: 3,
      },
    },
  })
  async removeAllDevices(@Request() req: any) {
    const userId = req.user.userId;

    const count = await this.authService.removeAllTrustedDevices(userId);

    return {
      success: true,
      message: 'Todos los dispositivos confiables han sido eliminados',
      count,
    };
  }
}
