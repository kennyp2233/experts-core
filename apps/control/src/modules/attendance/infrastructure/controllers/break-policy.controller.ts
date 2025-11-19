import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BreakPolicyService } from '../services/break-policy.service';
import {
  CreateBreakPolicyDto,
  UpdateBreakPolicyDto,
  CalculateBreaksDto,
  ListBreakPoliciesQueryDto,
  GetEffectiveConfigurationQueryDto,
} from '../../application/dto/break-policy.dto';
import { JwtGuard } from '../../../auth/guards/jwt.guard';

/**
 * Controller para gestionar políticas de breaks (descansos)
 */
@ApiTags('Break Policies')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('attendance/break-policies')
export class BreakPolicyController {
  constructor(private readonly breakPolicyService: BreakPolicyService) {}

  /**
   * Crear nueva política de breaks
   */
  @Post()
  @ApiOperation({
    summary: 'Crear política de breaks',
    description:
      'Crea una nueva política de breaks con cascading configuration (GLOBAL, DEPOT, WORKER)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Política creada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado',
  })
  async createPolicy(@Body() dto: CreateBreakPolicyDto) {
    const policy = await this.breakPolicyService.createPolicy(dto);

    return {
      success: true,
      message: 'Break policy created successfully',
      data: policy,
    };
  }

  /**
   * Listar todas las políticas
   */
  @Get()
  @ApiOperation({
    summary: 'Listar políticas de breaks',
    description: 'Obtiene todas las políticas con filtros opcionales',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de políticas',
  })
  async listPolicies(@Query() query: ListBreakPoliciesQueryDto) {
    const policies = await this.breakPolicyService.listPolicies({
      level: query.level,
      entityId: query.entityId,
      isActive: query.isActive,
    });

    return {
      success: true,
      data: policies,
      count: policies.length,
    };
  }

  /**
   * Obtener política por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener política por ID',
    description: 'Obtiene una política específica por su ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la política',
    example: 'policy-uuid-123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Política encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Política no encontrada',
  })
  async getPolicy(@Param('id') id: string) {
    const policy = await this.breakPolicyService.getPolicy(id);

    return {
      success: true,
      data: policy,
    };
  }

  /**
   * Actualizar política existente
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar política de breaks',
    description: 'Actualiza una política existente. Incrementa la versión si se cambia la configuración.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la política',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Política actualizada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Política no encontrada',
  })
  async updatePolicy(@Param('id') id: string, @Body() dto: UpdateBreakPolicyDto) {
    const policy = await this.breakPolicyService.updatePolicy(id, dto);

    return {
      success: true,
      message: 'Break policy updated successfully',
      data: policy,
    };
  }

  /**
   * Eliminar política (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar política de breaks',
    description: 'Elimina lógicamente una política (soft delete, marca como inactiva)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la política',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Política eliminada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Política no encontrada',
  })
  async deletePolicy(@Param('id') id: string) {
    await this.breakPolicyService.deletePolicy(id);

    return {
      success: true,
      message: 'Break policy deleted successfully',
    };
  }

  /**
   * Calcular breaks para X horas trabajadas
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calcular breaks',
    description:
      'Calcula los breaks aplicables para un número de horas trabajadas, considerando cascading configuration',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cálculo de breaks exitoso',
  })
  async calculateBreaks(@Body() dto: CalculateBreaksDto) {
    const calculation = await this.breakPolicyService.calculateBreaks(
      dto.totalHours,
      dto.depotId,
      dto.workerId,
    );

    return {
      success: true,
      data: calculation,
    };
  }

  /**
   * Obtener configuración efectiva (con cascading)
   */
  @Get('configuration/effective')
  @ApiOperation({
    summary: 'Obtener configuración efectiva',
    description:
      'Obtiene la configuración efectiva de breaks considerando cascading (WORKER > DEPOT > GLOBAL)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuración efectiva',
  })
  async getEffectiveConfiguration(@Query() query: GetEffectiveConfigurationQueryDto) {
    const result = await this.breakPolicyService.getBreakConfiguration(
      query.depotId,
      query.workerId,
    );

    return {
      success: true,
      data: {
        configuration: result.configuration,
        policyUsed: {
          id: result.policyId,
          level: result.level,
          name: result.name,
        },
        cascadingInfo: {
          workerId: query.workerId || null,
          depotId: query.depotId || null,
          effectiveLevel: result.level,
        },
      },
    };
  }

  /**
   * Limpiar cache de políticas
   */
  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar cache',
    description: 'Limpia el cache de políticas de breaks (solo para administradores)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache limpiado exitosamente',
  })
  async clearCache() {
    this.breakPolicyService.clearCache();

    return {
      success: true,
      message: 'Break policy cache cleared successfully',
    };
  }
}
