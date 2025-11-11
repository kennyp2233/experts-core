import { PartialType } from '@nestjs/swagger';
import { CreateDestinoDto } from './create-destino.dto';

export class UpdateDestinoDto extends PartialType(CreateDestinoDto) {}

export * from './create-destino.dto';
export * from './pagination-response.dto';
