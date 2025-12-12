import {
    Controller,
    Post,
    Body,
    Get,
    Query,
    UseInterceptors,
    UploadedFile,
    ParseFilePipeBuilder,
    HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { CatalogsService } from './catalogs.service';
import { ReloadCatalogDto } from './dto/reload-catalog.dto';
import { SearchProductoDto } from './dto/search-producto.dto';

@Controller({ path: 'catalogs', version: '1' })
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
    async searchProductosAutocomplete(@Query('q') query: string) {
        return this.service.searchProductosAutocomplete(query);
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


