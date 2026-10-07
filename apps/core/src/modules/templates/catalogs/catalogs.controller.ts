import {
    Controller,
    Post,
    Body,
    Get,
    Query,
    UseInterceptors,
    UploadedFile,
    ParseFilePipeBuilder,
    HttpStatus,
    UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { CatalogsService } from './catalogs.service';
import { ReloadCatalogDto } from './dto/reload-catalog.dto';
import { SearchProductoDto } from './dto/search-producto.dto';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/v1/guards/roles.guard';
import { Roles } from '../../auth/v1/decorators/roles.decorator';
import { UserRole } from '../../auth/v1/dto/update-user-role.dto';

@Controller({ path: 'catalogs', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CatalogsController {
    constructor(private readonly service: CatalogsService) { }

    @Post('reload')
    @UseInterceptors(FileInterceptor('file'))
    async reload(
        @Body() dto: ReloadCatalogDto,
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({
                    fileType: '.(xlsx|xls|sheet)',
                })
                .addMaxSizeValidator({
                    maxSize: 1024 * 1024 * 5
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
                }),
        ) file: Express.Multer.File,
    ) {
        return this.service.reloadCatalogs(dto, file);
    }

    @Get('productos/search')
    async searchProducto(@Query() dto: SearchProductoDto) {
        return this.service.searchProducto(dto);
    }

    @Get('productos/autocomplete')
    async searchProductosAutocomplete(
        @Query('q') query: string,
        @Query('subtipo') subtipo?: string
    ) {
        return this.service.searchProductosAutocomplete(query, subtipo);
    }

    @Get('productos/subtipos')
    async getSubtipos() {
        return this.service.getSubtipos();
    }

    @Post('productos/auto-match')
    async autoMatchProducts(@Body() body: { productCodes: string[] }) {
        return this.service.autoMatchProducts(body.productCodes);
    }

    @Get('stats')
    async stats() {
        return this.service.getStats();
    }

    @Get('puertos')
    async listPuertos(@Query('esEcuador') esEcuador?: string) {
        return this.service.listPuertos(esEcuador === 'true');
    }

    @Get('puertos/search')
    async searchPuertos(
        @Query('q') query: string,
        @Query('esEcuador') esEcuador?: string
    ) {
        return this.service.searchPuertos(query, esEcuador === 'true');
    }
}
