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
import { BodegueroService } from './services/bodeguero.service';
import { CreateBodegueroDto, UpdateBodegueroDto } from './dto';
import { Bodeguero } from './entities/bodeguero.entity';

@ApiTags('bodeguero')
@Controller({
  path: 'master-data/bodeguero',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BodegueroController {
  constructor(private readonly bodegueroService: BodegueroService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bodeguero' })
  @ApiResponse({
    status: 201,
    description: 'The bodeguero has been successfully created.',
    type: Bodeguero,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createDto: CreateBodegueroDto) {
    return this.bodegueroService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bodegueros' })
  @ApiResponse({
    status: 200,
    description: 'List of all bodegueros',
    type: [Bodeguero],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll() {
    return this.bodegueroService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bodeguero by ID' })
  @ApiResponse({
    status: 200,
    description: 'The bodeguero data',
    type: Bodeguero,
  })
  @ApiResponse({ status: 404, description: 'Bodeguero not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id') id: string) {
    return this.bodegueroService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bodeguero' })
  @ApiResponse({
    status: 200,
    description: 'The bodeguero has been successfully updated.',
    type: Bodeguero,
  })
  @ApiResponse({ status: 404, description: 'Bodeguero not found' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBodegueroDto,
  ) {
    return this.bodegueroService.update(+id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bodeguero' })
  @ApiResponse({
    status: 204,
    description: 'The bodeguero has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Bodeguero not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string) {
    return this.bodegueroService.remove(+id);
  }
}