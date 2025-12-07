import { Module } from '@nestjs/common';
import { GuiaMadreModule } from './guia-madre/guia-madre.module';
import { DocumentoBaseModule } from './documento-base/documento-base.module';

@Module({
    imports: [
        GuiaMadreModule,
        DocumentoBaseModule,
    ],
    exports: [
        GuiaMadreModule,
        DocumentoBaseModule,
    ],
})
export class DocumentsModule { }
