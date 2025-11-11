import { PartialType } from '@nestjs/swagger';
import { CreateTipoEmbalajeDto } from './create-tipo-embalaje.dto';

export class UpdateTipoEmbalajeDto extends PartialType(CreateTipoEmbalajeDto) {}