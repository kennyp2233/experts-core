import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, AdminDto } from './dto/auth-response.dto';
import { JwtGuard } from './guards/jwt.guard';
import { RolesGuard, Roles } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(ValidationPipe) loginDto: LoginDto
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtGuard)
  async getProfile(@Request() req): Promise<{
    success: boolean;
    data: AdminDto;
  }> {
    const admin = await this.authService.getProfile(req.user.id);
    return {
      success: true,
      data: admin
    };
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async logout(): Promise<{
    success: boolean;
    message: string;
  }> {
    // En JWT stateless, el logout se maneja en el frontend
    // eliminando el token del storage
    return {
      success: true,
      message: 'Logout exitoso'
    };
  }

  // Endpoint adicional para administradores de nivel superior
  @Get('admin-only')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  async adminOnly(@Request() req): Promise<{
    success: boolean;
    message: string;
    user: any;
  }> {
    return {
      success: true,
      message: 'Acceso solo para super administradores',
      user: req.user
    };
  }
}
