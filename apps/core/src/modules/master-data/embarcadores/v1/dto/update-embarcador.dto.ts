import { PartialType } from '@nestjs/swagger';
import { CreateEmbarcadorDto } from './create-embarcador.dto';

export class UpdateEmbarcadorDto extends PartialType(CreateEmbarcadorDto) {}

export * from './create-embarcador.dto';
