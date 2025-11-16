import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '.prisma/productos-client';
import { CreateFuncionarioAgrocalidadDto, UpdateFuncionarioAgrocalidadDto } from '../dto';

@Injectable()
export class FuncionarioAgrocalidadService {
  private readonly logger = new Logger(FuncionarioAgrocalidadService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) {}

  async create(createFuncionarioAgrocalidadDto: CreateFuncionarioAgrocalidadDto) {
    try {
      if (!createFuncionarioAgrocalidadDto.nombre || createFuncionarioAgrocalidadDto.nombre.trim() === '') {
        throw new BadRequestException('El nombre del funcionario es requerido');
      }

      // Verificar que el nombre no esté duplicado
      const existingFuncionario = await this.prisma.funcionarioAgrocalidad.findFirst({
        where: { nombre: createFuncionarioAgrocalidadDto.nombre.trim() },
      });

      if (existingFuncionario) {
        throw new BadRequestException(
          `Ya existe un funcionario con el nombre ${createFuncionarioAgrocalidadDto.nombre}`,
        );
      }

      // Validar email si se proporciona
      if (createFuncionarioAgrocalidadDto.email) {
        const existingEmail = await this.prisma.funcionarioAgrocalidad.findFirst({
          where: { email: createFuncionarioAgrocalidadDto.email.trim() },
        });

        if (existingEmail) {
          throw new BadRequestException(
            `Ya existe un funcionario con el email ${createFuncionarioAgrocalidadDto.email}`,
          );
        }
      }

      const funcionario = await this.prisma.funcionarioAgrocalidad.create({
        data: {
          nombre: createFuncionarioAgrocalidadDto.nombre.trim(),
          telefono: createFuncionarioAgrocalidadDto.telefono?.trim(),
          email: createFuncionarioAgrocalidadDto.email?.trim(),
          estado: createFuncionarioAgrocalidadDto.estado ?? true,
        },
      });

      this.logger.log(`Funcionario creado: ${funcionario.id} - ${funcionario.nombre}`);

      return funcionario;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al crear funcionario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear funcionario');
    }
  }

  async findAll(skip?: number, take?: number, sortField?: string, sortOrder?: string) {
    try {
      // Configurar ordenamiento por defecto
      let orderBy: any = {
        nombre: 'asc',
      };

      // Aplicar ordenamiento personalizado si se proporciona
      if (sortField && sortOrder) {
        orderBy = {
          [sortField]: sortOrder,
        };
      }

      const [funcionarios, total] = await Promise.all([
        this.prisma.funcionarioAgrocalidad.findMany({
          skip,
          take,
          orderBy,
        }),
        this.prisma.funcionarioAgrocalidad.count(),
      ]);

      return {
        data: funcionarios,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener funcionarios: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener funcionarios');
    }
  }

  async findOne(id: number) {
    try {
      const funcionario = await this.prisma.funcionarioAgrocalidad.findUnique({
        where: { id },
      });

      if (!funcionario) {
        throw new NotFoundException(`Funcionario con ID ${id} no encontrado`);
      }

      return funcionario;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener funcionario: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener funcionario');
    }
  }

  async update(id: number, updateFuncionarioAgrocalidadDto: UpdateFuncionarioAgrocalidadDto) {
    try {
      const funcionario = await this.prisma.funcionarioAgrocalidad.findUnique({
        where: { id },
      });

      if (!funcionario) {
        throw new NotFoundException(`Funcionario con ID ${id} no encontrado`);
      }

      // Verificar nombre duplicado si se está actualizando
      if (updateFuncionarioAgrocalidadDto.nombre) {
        const existingFuncionario = await this.prisma.funcionarioAgrocalidad.findFirst({
          where: { nombre: updateFuncionarioAgrocalidadDto.nombre.trim() },
        });

        if (existingFuncionario && existingFuncionario.id !== id) {
          throw new BadRequestException(
            `Ya existe un funcionario con el nombre ${updateFuncionarioAgrocalidadDto.nombre}`,
          );
        }
      }

      // Verificar email duplicado si se está actualizando
      if (updateFuncionarioAgrocalidadDto.email) {
        const existingEmail = await this.prisma.funcionarioAgrocalidad.findFirst({
          where: { email: updateFuncionarioAgrocalidadDto.email.trim() },
        });

        if (existingEmail && existingEmail.id !== id) {
          throw new BadRequestException(
            `Ya existe un funcionario con el email ${updateFuncionarioAgrocalidadDto.email}`,
          );
        }
      }

      const updateData: any = {};

      if (updateFuncionarioAgrocalidadDto.nombre !== undefined) {
        updateData.nombre = updateFuncionarioAgrocalidadDto.nombre.trim();
      }
      if (updateFuncionarioAgrocalidadDto.telefono !== undefined) {
        updateData.telefono = updateFuncionarioAgrocalidadDto.telefono?.trim();
      }
      if (updateFuncionarioAgrocalidadDto.email !== undefined) {
        updateData.email = updateFuncionarioAgrocalidadDto.email?.trim();
      }
      if (updateFuncionarioAgrocalidadDto.estado !== undefined) {
        updateData.estado = updateFuncionarioAgrocalidadDto.estado;
      }

      const updatedFuncionario = await this.prisma.funcionarioAgrocalidad.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Funcionario actualizado: ${id} - ${updatedFuncionario.nombre}`);

      return updatedFuncionario;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar funcionario: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar funcionario');
    }
  }

  async remove(id: number) {
    try {
      const funcionario = await this.prisma.funcionarioAgrocalidad.findUnique({
        where: { id },
      });

      if (!funcionario) {
        throw new NotFoundException(`Funcionario con ID ${id} no encontrado`);
      }

      await this.prisma.funcionarioAgrocalidad.delete({
        where: { id },
      });

      this.logger.log(`Funcionario eliminado: ${id} - ${funcionario.nombre}`);

      return {
        message: `Funcionario ${funcionario.nombre} eliminado exitosamente`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar funcionario: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar funcionario');
    }
  }

  async findByName(nombre: string) {
    try {
      const funcionarios = await this.prisma.funcionarioAgrocalidad.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
      });

      return funcionarios;
    } catch (error) {
      this.logger.error(
        `Error al buscar funcionarios: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar funcionarios');
    }
  }

  async findByEmail(email: string) {
    try {
      const funcionario = await this.prisma.funcionarioAgrocalidad.findFirst({
        where: { email },
      });

      return funcionario;
    } catch (error) {
      this.logger.error(
        `Error al buscar funcionario por email: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar funcionario por email');
    }
  }
}