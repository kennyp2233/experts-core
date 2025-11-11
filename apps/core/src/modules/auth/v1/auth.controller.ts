import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthControllerV1 {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        id: 'cm3hj9k8l0000xjke8bqf5z9m',
        email: 'user@example.com',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        createdAt: '2024-11-10T12:00:00.000Z',
        updatedAt: '2024-11-10T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario o email ya existe',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'cm3hj9k8l0000xjke8bqf5z9m',
          username: 'johndoe',
          email: 'user@example.com',
          role: 'USER',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
