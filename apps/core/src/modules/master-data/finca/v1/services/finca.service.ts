import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@internal/datos-maestros-client';
import { CreateFincaDto, UpdateFincaDto } from '../dto';
import { FincaRelacionesService } from './finca-relaciones.service';

@Injectable()
export class FincaService {
  private readonly logger = new Logger(FincaService.name);

  constructor(
    @Inject('PrismaClientDatosMaestros') private prisma: PrismaClient,
    private relacionesService: FincaRelacionesService,
  ) { }

  async create(createFincaDto: CreateFincaDto) {
    try {
      if (!createFincaDto.nombreFinca || createFincaDto.nombreFinca.trim() === '') {
        throw new BadRequestException('El nombre de la finca es requerido');
      }

      if (!createFincaDto.tipoDocumento || createFincaDto.tipoDocumento.trim() === '') {
        throw new BadRequestException('El tipo de documento es requerido');
      }

      const finca = await this.prisma.finca.create({
        data: {
          nombreFinca: createFincaDto.nombreFinca.trim(),
          tag: createFincaDto.tag?.trim(),
          rucFinca: createFincaDto.rucFinca?.trim(),
          tipoDocumento: createFincaDto.tipoDocumento.trim(),
          generaGuiasCertificadas: createFincaDto.generaGuiasCertificadas ?? false,
          iGeneralTelefono: createFincaDto.iGeneralTelefono?.trim(),
          iGeneralEmail: createFincaDto.iGeneralEmail?.trim(),
          iGeneralCiudad: createFincaDto.iGeneralCiudad?.trim(),
          iGeneralProvincia: createFincaDto.iGeneralProvincia?.trim(),
          iGeneralPais: createFincaDto.iGeneralPais?.trim(),
          iGeneralCodSesa: createFincaDto.iGeneralCodSesa?.trim(),
          iGeneralCodPais: createFincaDto.iGeneralCodPais?.trim(),
          aNombre: createFincaDto.aNombre?.trim(),
          aCodigo: createFincaDto.aCodigo?.trim(),
          aDireccion: createFincaDto.aDireccion?.trim(),
          estado: createFincaDto.estado ?? true,
          // Crear relaciones anidadas si se proporcionan
          ...(createFincaDto.choferesIds && createFincaDto.choferesIds.length > 0 && {
            fincasChoferes: {
              create: createFincaDto.choferesIds.map((idChofer) => ({
                idChofer,
              })),
            },
          }),
          ...(createFincaDto.productosIds && createFincaDto.productosIds.length > 0 && {
            fincasProductos: {
              create: createFincaDto.productosIds.map((idProducto) => ({
                idProducto,
              })),
            },
          }),
        },
        include: {
          fincasChoferes: {
            include: {
              chofer: true,
            },
          },
          fincasProductos: {
            include: {
              producto: true,
            },
          },
        },
      });

      this.logger.log(`Finca creada: ${finca.id} - ${finca.nombreFinca}`);
      return finca;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al crear finca: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear finca');
    }
  }

  async findAll(skip?: number, take?: number, sortField?: string, sortOrder?: string) {
    try {
      // Configurar ordenamiento por defecto
      let orderBy: any = {
        nombreFinca: 'asc',
      };

      // Aplicar ordenamiento personalizado si se proporciona
      if (sortField && sortOrder) {
        orderBy = {
          [sortField]: sortOrder,
        };
      }

      const [fincas, total] = await Promise.all([
        this.prisma.finca.findMany({
          skip,
          take,
          include: {
            fincasChoferes: {
              include: {
                chofer: true,
              },
            },
            fincasProductos: {
              include: {
                producto: true,
              },
            },
          },
          orderBy,
        }),
        this.prisma.finca.count(),
      ]);

      return {
        data: fincas,
        total,
        skip: skip || 0,
        take: take || total,
      };
    } catch (error) {
      this.logger.error(`Error al obtener fincas: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al obtener fincas');
    }
  }

  async findOne(id: number) {
    try {
      const finca = await this.prisma.finca.findUnique({
        where: { id },
        include: {
          fincasChoferes: {
            include: {
              chofer: true,
            },
          },
          fincasProductos: {
            include: {
              producto: true,
            },
          },
        },
      });

      if (!finca) {
        throw new NotFoundException(`Finca con ID ${id} no encontrada`);
      }

      return finca;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener finca: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al obtener finca');
    }
  }

  async update(id: number, updateFincaDto: UpdateFincaDto) {
    try {
      const finca = await this.prisma.finca.findUnique({
        where: { id },
      });

      if (!finca) {
        throw new NotFoundException(`Finca con ID ${id} no encontrada`);
      }

      // Construir el objeto data dinámicamente
      const updateData: any = {};

      // Actualizar campos de la finca
      if (updateFincaDto.nombreFinca !== undefined) {
        updateData.nombreFinca = updateFincaDto.nombreFinca.trim();
      }
      if (updateFincaDto.tag !== undefined) {
        updateData.tag = updateFincaDto.tag?.trim();
      }
      if (updateFincaDto.rucFinca !== undefined) {
        updateData.rucFinca = updateFincaDto.rucFinca?.trim();
      }
      if (updateFincaDto.tipoDocumento !== undefined) {
        updateData.tipoDocumento = updateFincaDto.tipoDocumento.trim();
      }
      if (updateFincaDto.generaGuiasCertificadas !== undefined) {
        updateData.generaGuiasCertificadas = updateFincaDto.generaGuiasCertificadas;
      }
      if (updateFincaDto.iGeneralTelefono !== undefined) {
        updateData.iGeneralTelefono = updateFincaDto.iGeneralTelefono?.trim();
      }
      if (updateFincaDto.iGeneralEmail !== undefined) {
        updateData.iGeneralEmail = updateFincaDto.iGeneralEmail?.trim();
      }
      if (updateFincaDto.iGeneralCiudad !== undefined) {
        updateData.iGeneralCiudad = updateFincaDto.iGeneralCiudad?.trim();
      }
      if (updateFincaDto.iGeneralProvincia !== undefined) {
        updateData.iGeneralProvincia = updateFincaDto.iGeneralProvincia?.trim();
      }
      if (updateFincaDto.iGeneralPais !== undefined) {
        updateData.iGeneralPais = updateFincaDto.iGeneralPais?.trim();
      }
      if (updateFincaDto.iGeneralCodSesa !== undefined) {
        updateData.iGeneralCodSesa = updateFincaDto.iGeneralCodSesa?.trim();
      }
      if (updateFincaDto.iGeneralCodPais !== undefined) {
        updateData.iGeneralCodPais = updateFincaDto.iGeneralCodPais?.trim();
      }
      if (updateFincaDto.aNombre !== undefined) {
        updateData.aNombre = updateFincaDto.aNombre?.trim();
      }
      if (updateFincaDto.aCodigo !== undefined) {
        updateData.aCodigo = updateFincaDto.aCodigo?.trim();
      }
      if (updateFincaDto.aDireccion !== undefined) {
        updateData.aDireccion = updateFincaDto.aDireccion?.trim();
      }
      if (updateFincaDto.estado !== undefined) {
        updateData.estado = updateFincaDto.estado;
      }

      // Manejar relaciones usando el servicio de relaciones
      await this.relacionesService.handleRelacionesUpdateForExistingFinca(
        id,
        updateFincaDto.choferesIds,
        updateFincaDto.productosIds,
      );

      const updatedFinca = await this.prisma.finca.update({
        where: { id },
        data: updateData,
        include: {
          fincasChoferes: {
            include: {
              chofer: true,
            },
          },
          fincasProductos: {
            include: {
              producto: true,
            },
          },
        },
      });

      this.logger.log(`Finca actualizada: ${id} - ${updatedFinca.nombreFinca}`);
      return updatedFinca;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al actualizar finca: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al actualizar finca');
    }
  }

  async remove(id: number) {
    try {
      const finca = await this.prisma.finca.findUnique({
        where: { id },
      });

      if (!finca) {
        throw new NotFoundException(`Finca con ID ${id} no encontrada`);
      }

      await this.prisma.finca.delete({
        where: { id },
      });

      this.logger.log(`Finca eliminada: ${id} - ${finca.nombreFinca}`);
      return { message: `Finca ${finca.nombreFinca} eliminada exitosamente` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al eliminar finca: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al eliminar finca');
    }
  }

  async findByName(nombreFinca: string) {
    try {
      const fincas = await this.prisma.finca.findMany({
        where: {
          nombreFinca: {
            contains: nombreFinca,
            mode: 'insensitive',
          },
        },
        include: {
          fincasChoferes: {
            include: {
              chofer: true,
            },
          },
          fincasProductos: {
            include: {
              producto: true,
            },
          },
        },
      });

      return fincas;
    } catch (error) {
      this.logger.error(`Error al buscar fincas: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al buscar fincas');
    }
  }

  async findByRuc(rucFinca: string) {
    try {
      const finca = await this.prisma.finca.findFirst({
        where: { rucFinca },
        include: {
          fincasChoferes: {
            include: {
              chofer: true,
            },
          },
          fincasProductos: {
            include: {
              producto: true,
            },
          },
        },
      });

      return finca;
    } catch (error) {
      this.logger.error(`Error al buscar finca por RUC: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al buscar finca por RUC');
    }
  }
}