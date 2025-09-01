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
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto, UpdateWorkerStatusDto } from './dto/update-worker.dto';
import { QueryWorkersDto } from './dto/query-workers.dto';
import {
  WorkerResponseDto,
  WorkersListResponseDto,
  WorkerCreateResponseDto,
  WorkerUpdateResponseDto,
  WorkerDeleteResponseDto
} from './dto/worker-response.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

@Controller('workers')
@UseGuards(JwtGuard)
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async findAll(
    @Query(ValidationPipe) query: QueryWorkersDto
  ): Promise<WorkersListResponseDto> {
    return this.workersService.findAll(query);
  }

  @Get('by-depot/:depotId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async findByDepot(
    @Param('depotId') depotId: string,
    @Query(ValidationPipe) query: QueryWorkersDto
  ): Promise<WorkersListResponseDto> {
    return this.workersService.findByDepot(depotId, query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: WorkerResponseDto;
  }> {
    const worker = await this.workersService.findOne(id);
    return {
      success: true,
      data: worker
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createWorkerDto: CreateWorkerDto
  ): Promise<WorkerCreateResponseDto> {
    const worker = await this.workersService.create(createWorkerDto);
    return {
      success: true,
      data: worker,
      message: 'Worker creado exitosamente'
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateWorkerDto: UpdateWorkerDto
  ): Promise<WorkerUpdateResponseDto> {
    const worker = await this.workersService.update(id, updateWorkerDto);
    return {
      success: true,
      data: worker,
      message: 'Worker actualizado exitosamente'
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  async updatePartial(
    @Param('id') id: string,
    @Body(ValidationPipe) updateWorkerDto: Partial<UpdateWorkerDto>
  ): Promise<WorkerUpdateResponseDto> {
    const worker = await this.workersService.update(id, updateWorkerDto);
    return {
      success: true,
      data: worker,
      message: 'Worker actualizado exitosamente'
    };
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  async updateStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) updateStatusDto: UpdateWorkerStatusDto
  ): Promise<WorkerUpdateResponseDto> {
    const worker = await this.workersService.updateStatus(id, updateStatusDto);
    return {
      success: true,
      data: worker,
      message: `Status del worker actualizado a ${updateStatusDto.status}`
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WorkerDeleteResponseDto> {
    await this.workersService.remove(id);
    return {
      success: true,
      message: 'Worker desactivado exitosamente'
    };
  }
}
