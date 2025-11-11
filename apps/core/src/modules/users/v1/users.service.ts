import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/usuarios-client';
import { UpdateUserRoleDto } from '../../auth/v1/dto/update-user-role.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject('PrismaClientUsuarios') private prisma: PrismaClient) {}

  async findAll() {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return users;
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al obtener usuarios');
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al obtener usuario');
    }
  }

  async updateRole(userId: string, updateRoleDto: UpdateUserRoleDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role: updateRoleDto.role },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(
        `User role updated: ${user.username} -> ${updateRoleDto.role}`,
      );
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating user role: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al actualizar rol de usuario',
      );
    }
  }

  async toggleUserStatus(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: !user.isActive },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(
        `User status toggled: ${user.username} -> ${updatedUser.isActive ? 'active' : 'inactive'}`,
      );
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error toggling user status: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al cambiar estado de usuario',
      );
    }
  }
}
