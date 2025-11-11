import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/v1/guards/roles.guard';
import { Roles } from '../../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../../auth/v1/dto/update-user-role.dto';
import { FuncionarioAgrocalidadService } from './services/funcionario-agrocalidad.service';
import { CreateFuncionarioAgrocalidadDto, UpdateFuncionarioAgrocalidadDto } from './dto';
import { FuncionarioAgrocalidad } from './entities/funcionario-agrocalidad.entity';

@ApiTags('funcionario-agrocalidad')
@Controller({
  path: 'master-data/funcionario-agrocalidad',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class FuncionarioAgrocalidadController {
  constructor(
    private readonly funcionarioAgrocalidadService: FuncionarioAgrocalidadService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new funcionario agrocalidad' })
  @ApiResponse({
    status: 201,
    description: 'The funcionario agrocalidad has been successfully created.',
    type: FuncionarioAgrocalidad,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createDto: CreateFuncionarioAgrocalidadDto) {
    return this.funcionarioAgrocalidadService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all funcionarios agrocalidad' })
  @ApiResponse({
    status: 200,
    description: 'List of all funcionarios agrocalidad',
    type: [FuncionarioAgrocalidad],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll() {
    return this.funcionarioAgrocalidadService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a funcionario agrocalidad by ID' })
  @ApiResponse({
    status: 200,
    description: 'The funcionario agrocalidad data',
    type: FuncionarioAgrocalidad,
  })
  @ApiResponse({ status: 404, description: 'Funcionario agrocalidad not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id') id: string) {
    return this.funcionarioAgrocalidadService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a funcionario agrocalidad' })
  @ApiResponse({
    status: 200,
    description: 'The funcionario agrocalidad has been successfully updated.',
    type: FuncionarioAgrocalidad,
  })
  @ApiResponse({ status: 404, description: 'Funcionario agrocalidad not found' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFuncionarioAgrocalidadDto,
  ) {
    return this.funcionarioAgrocalidadService.update(+id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a funcionario agrocalidad' })
  @ApiResponse({
    status: 204,
    description: 'The funcionario agrocalidad has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Funcionario agrocalidad not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string) {
    return this.funcionarioAgrocalidadService.remove(+id);
  }
}