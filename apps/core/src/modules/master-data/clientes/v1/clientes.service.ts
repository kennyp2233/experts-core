import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateClienteDto, UpdateClienteDto } from './dto';

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
  ) { }

  async create(createClienteDto: CreateClienteDto) {
    try {
      if (
        !createClienteDto.nombre ||
        createClienteDto.nombre.trim() === ''
      ) {
        throw new BadRequestException('El nombre del cliente es requerido');
      }

      const cliente = await this.prisma.cliente.create({
        data: {
          nombre: createClienteDto.nombre.trim(),
          ruc: createClienteDto.ruc?.trim(),
          direccion: createClienteDto.direccion?.trim(),
          telefono: createClienteDto.telefono?.trim(),
          email: createClienteDto.email?.trim(),
          ciudad: createClienteDto.ciudad?.trim(),
          pais: createClienteDto.pais?.trim(),
          clienteCodigoPais: createClienteDto.clienteCodigoPais?.trim(),
          fitosValor: createClienteDto.fitosValor,
          formA: createClienteDto.formA,
          transport: createClienteDto.transport,
          termo: createClienteDto.termo,
          mica: createClienteDto.mica,
          handling: createClienteDto.handling,
          cuentaContable: createClienteDto.cuentaContable?.trim(),
          nombreFactura: createClienteDto.nombreFactura?.trim(),
          rucFactura: createClienteDto.rucFactura?.trim(),
          direccionFactura: createClienteDto.direccionFactura?.trim(),
          telefonoFactura: createClienteDto.telefonoFactura?.trim(),
          estado: createClienteDto.estado ?? true,
        },
      });

      this.logger.log(
        `Cliente creado: ${cliente.id} - ${cliente.nombre}`,
      );
      return cliente;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al crear cliente: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al crear cliente');
    }
  }

  async findAll(skip?: number, take?: number) {
    try {
      const [clientes, total] = await Promise.all([
        this.prisma.cliente.findMany({
          skip,
          take,
          orderBy: {
            nombre: 'asc',
          },
        }),
        this.prisma.cliente.count(),
      ]);

      return {
        data: clientes,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener clientes: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener clientes');
    }
  }

  async findOne(id: number) {
    try {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id },
      });

      if (!cliente) {
        throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      }

      return cliente;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener cliente: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener cliente');
    }
  }

  async update(id: number, updateClienteDto: UpdateClienteDto) {
    try {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id },
      });

      if (!cliente) {
        throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      }

      // Construir el objeto data dinámicamente
      const updateData: any = {};

      if (updateClienteDto.nombre !== undefined) {
        updateData.nombre = updateClienteDto.nombre.trim();
      }
      if (updateClienteDto.ruc !== undefined) {
        updateData.ruc = updateClienteDto.ruc?.trim();
      }
      if (updateClienteDto.direccion !== undefined) {
        updateData.direccion = updateClienteDto.direccion?.trim();
      }
      if (updateClienteDto.telefono !== undefined) {
        updateData.telefono = updateClienteDto.telefono?.trim();
      }
      if (updateClienteDto.email !== undefined) {
        updateData.email = updateClienteDto.email?.trim();
      }
      if (updateClienteDto.ciudad !== undefined) {
        updateData.ciudad = updateClienteDto.ciudad?.trim();
      }
      if (updateClienteDto.pais !== undefined) {
        updateData.pais = updateClienteDto.pais?.trim();
      }
      if (updateClienteDto.clienteCodigoPais !== undefined) {
        updateData.clienteCodigoPais = updateClienteDto.clienteCodigoPais?.trim();
      }
      if (updateClienteDto.fitosValor !== undefined) {
        updateData.fitosValor = updateClienteDto.fitosValor;
      }
      if (updateClienteDto.formA !== undefined) {
        updateData.formA = updateClienteDto.formA;
      }
      if (updateClienteDto.transport !== undefined) {
        updateData.transport = updateClienteDto.transport;
      }
      if (updateClienteDto.termo !== undefined) {
        updateData.termo = updateClienteDto.termo;
      }
      if (updateClienteDto.mica !== undefined) {
        updateData.mica = updateClienteDto.mica;
      }
      if (updateClienteDto.handling !== undefined) {
        updateData.handling = updateClienteDto.handling;
      }
      if (updateClienteDto.cuentaContable !== undefined) {
        updateData.cuentaContable = updateClienteDto.cuentaContable?.trim();
      }
      if (updateClienteDto.nombreFactura !== undefined) {
        updateData.nombreFactura = updateClienteDto.nombreFactura?.trim();
      }
      if (updateClienteDto.rucFactura !== undefined) {
        updateData.rucFactura = updateClienteDto.rucFactura?.trim();
      }
      if (updateClienteDto.direccionFactura !== undefined) {
        updateData.direccionFactura = updateClienteDto.direccionFactura?.trim();
      }
      if (updateClienteDto.telefonoFactura !== undefined) {
        updateData.telefonoFactura = updateClienteDto.telefonoFactura?.trim();
      }
      if (updateClienteDto.estado !== undefined) {
        updateData.estado = updateClienteDto.estado;
      }

      const updatedCliente = await this.prisma.cliente.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(
        `Cliente actualizado: ${id} - ${updatedCliente.nombre}`,
      );
      return updatedCliente;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar cliente: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar cliente');
    }
  }

  async remove(id: number) {
    try {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id },
      });

      if (!cliente) {
        throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      }

      await this.prisma.cliente.delete({
        where: { id },
      });

      this.logger.log(`Cliente eliminado: ${id} - ${cliente.nombre}`);
      return {
        message: `Cliente ${cliente.nombre} eliminado exitosamente`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar cliente: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar cliente');
    }
  }

  async findByName(nombre: string) {
    try {
      const clientes = await this.prisma.cliente.findMany({
        where: {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
      });

      return clientes;
    } catch (error) {
      this.logger.error(
        `Error al buscar clientes: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar clientes');
    }
  }
}