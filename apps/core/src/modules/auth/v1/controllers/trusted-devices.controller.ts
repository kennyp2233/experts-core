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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';

/**
 * Controlador de dispositivos confiables
 * Responsabilidad: Manejar requests HTTP relacionados con dispositivos confiables
 */
@ApiTags('Trusted Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'auth/devices',
  version: '1',
})
export class TrustedDevicesController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los dispositivos confiables del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de dispositivos confiables' })
  async listMyDevices(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    const devices = await this.authService.trustedDevices.getAll(userId);

    return { devices };
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un dispositivo confiable específico' })
  @ApiResponse({ status: 200, description: 'Dispositivo eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async removeDevice(@Request() req: any, @Param('deviceId') deviceId: string) {
    const userId = req.user.sub || req.user.userId;

    const removed = await this.authService.trustedDevices.remove(
      userId,
      deviceId,
    );

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
  @ApiResponse({ status: 200, description: 'Todos los dispositivos eliminados exitosamente' })
  async removeAllDevices(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const count = await this.authService.trustedDevices.removeAll(userId);

    return {
      success: true,
      message: 'Todos los dispositivos confiables han sido eliminados',
      count,
    };
  }
}
