import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe
} from '@nestjs/common';
import { DepotsService } from './depots.service';
import { CreateDepotDto } from './dto/create-depot.dto';
import { UpdateDepotDto } from './dto/update-depot.dto';
import { QueryDepotsDto } from './dto/query-depots.dto';
import { RegenerateSecretDto } from './dto/regenerate-secret.dto';
import {
  DepotResponseDto,
  DepotsListResponseDto,
  DepotCreateResponseDto,
  DepotUpdateResponseDto,
  DepotDeleteResponseDto,
  RegenerateSecretResponseDto,
  DepotStatsResponseDto
} from './dto/depot-response.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { WorkersService } from '../workers/workers.service';
import { QueryWorkersDto } from '../workers/dto/query-workers.dto';

@Controller('depots')
@UseGuards(JwtGuard)
export class DepotsController {
  constructor(
    private readonly depotsService: DepotsService,
    private readonly workersService: WorkersService
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async findAll(
    @Query(ValidationPipe) query: QueryDepotsDto
  ): Promise<DepotsListResponseDto> {
    return this.depotsService.findAll(query);
  }

  @Get('nearby')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async findNearby(
    @Query('lat', ValidationPipe) latitude: number,
    @Query('lng', ValidationPipe) longitude: number,
    @Query('radius', ValidationPipe) radiusKm: number = 10
  ): Promise<{
    success: boolean;
    data: DepotResponseDto[];
  }> {
    const depots = await this.depotsService.findNearby(latitude, longitude, radiusKm);
    return {
      success: true,
      data: depots
    };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: DepotResponseDto;
  }> {
    const depot = await this.depotsService.findOne(id);
    return {
      success: true,
      data: depot
    };
  }

  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async getStats(@Param('id') id: string): Promise<DepotStatsResponseDto> {
    return this.depotsService.getDepotStats(id);
  }

  @Get(':id/workers')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async getWorkers(
    @Param('id') depotId: string,
    @Query(ValidationPipe) query: QueryWorkersDto
  ) {
    return this.workersService.findByDepot(depotId, query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createDepotDto: CreateDepotDto
  ): Promise<DepotCreateResponseDto> {
    const depot = await this.depotsService.create(createDepotDto);
    return {
      success: true,
      data: depot,
      message: 'Depot creado exitosamente'
    };
  }

  @Post(':id/regenerate-secret')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async regenerateSecret(
    @Param('id') id: string,
    @Body(ValidationPipe) _regenerateSecretDto: RegenerateSecretDto
  ): Promise<RegenerateSecretResponseDto> {
    const result = await this.depotsService.regenerateSecret(id);
    return {
      success: true,
      data: {
        id: result.id,
        secretUpdatedAt: result.secretUpdatedAt,
        message: 'Secreto criptográfico regenerado exitosamente'
      },
      warning: 'Los códigos QR anteriores ya no serán válidos'
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDepotDto: UpdateDepotDto
  ): Promise<DepotUpdateResponseDto> {
    const depot = await this.depotsService.update(id, updateDepotDto);
    return {
      success: true,
      data: depot,
      message: 'Depot actualizado exitosamente'
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  async updatePartial(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDepotDto: Partial<UpdateDepotDto>
  ): Promise<DepotUpdateResponseDto> {
    const depot = await this.depotsService.update(id, updateDepotDto);
    return {
      success: true,
      data: depot,
      message: 'Depot actualizado exitosamente'
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<DepotDeleteResponseDto> {
    await this.depotsService.remove(id);
    return {
      success: true,
      message: 'Depot desactivado exitosamente'
    };
  }
}
