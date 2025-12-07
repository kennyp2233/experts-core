import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, ParseBoolPipe, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GuiaMadreService } from './services/guia-madre.service';
import { CreateGuiaMadreDto } from './dto/create-guia-madre.dto';
import { UpdateGuiaMadreDto } from './dto/update-guia-madre.dto';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard'; // Adjust path if needed
import { RolesGuard } from '../../auth/v1/guards/roles.guard'; // Adjust path if needed
// import { Roles } from '../../auth/v1/decorators/roles.decorator';
// import { UserRole } from '../../auth/v1/dto/update-user-role.dto';

// Assuming basic auth for now, user can uncomment Roles if specific roles needed
@ApiTags('documents/guia-madre')
@ApiBearerAuth()
@Controller({
    path: 'documents/guia-madre',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuiaMadreController {
    constructor(private readonly guiaMadreService: GuiaMadreService) { }

    @Post()
    @ApiOperation({ summary: 'Crear un lote de guías madre' })
    @ApiResponse({ status: 201, description: 'Guías creadas exitosamente' })
    create(@Body() createGuiaMadreDto: CreateGuiaMadreDto, @Req() req: any) {
        return this.guiaMadreService.createLote(createGuiaMadreDto, req.user?.userId);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener guías madre con filtros' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'aerolinea', required: false, type: Number, description: 'ID de Aerolínea' })
    @ApiQuery({ name: 'disponibles', required: false, type: Boolean })
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('aerolinea') aerolinea?: number,
        @Query('disponibles', new ParseBoolPipe({ optional: true })) disponibles?: boolean,
    ) {
        const pageNum = page ? Number(page) : 1;
        const limitNum = limit ? Number(limit) : 10;
        const aerolineaMod = aerolinea ? Number(aerolinea) : undefined;
        // dispBool no longer needed, use disponibles directly
        return this.guiaMadreService.findAll(pageNum, limitNum, aerolineaMod, disponibles);
    }

    @Get('disponibles')
    @ApiOperation({ summary: 'Obtener guías madre disponibles (Shortcut)' })
    @ApiQuery({ name: 'aerolinea', required: false, type: Number })
    getDisponibles(@Query('aerolinea') aerolinea?: number) {
        const aerolineaMod = aerolinea ? Number(aerolinea) : undefined;
        return this.guiaMadreService.getDisponibles(aerolineaMod);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener una guía madre por ID' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.guiaMadreService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar una guía madre' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateGuiaMadreDto: UpdateGuiaMadreDto,
    ) {
        return this.guiaMadreService.update(id, updateGuiaMadreDto);
    }
}
