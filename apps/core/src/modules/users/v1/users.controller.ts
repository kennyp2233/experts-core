import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import {
  UpdateUserRoleDto,
  UserRole,
} from '../../auth/v1/dto/update-user-role.dto';

@ApiTags('Users Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los usuarios (Solo ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios',
    schema: {
      example: [
        {
          id: 'cm3hj9k8l0000xjke8bqf5z9m',
          username: 'johndoe',
          email: 'user@example.com',
          role: 'USER',
          firstName: 'John',
          lastName: 'Doe',
          isActive: true,
          createdAt: '2024-11-10T12:00:00.000Z',
          updatedAt: '2024-11-10T12:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Forbidden - Solo administradores' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener usuario por ID (Solo ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Forbidden - Solo administradores' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar rol de usuario (Solo ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Rol actualizado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Forbidden - Solo administradores' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, updateRoleDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activar/Desactivar usuario (Solo ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Estado del usuario actualizado',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Forbidden - Solo administradores' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleUserStatus(id);
  }
}
