import { PartialType } from '@nestjs/swagger';
import { CreateTipoCargaDto } from './create-tipo-carga.dto';

export class UpdateTipoCargaDto extends PartialType(CreateTipoCargaDto) {}