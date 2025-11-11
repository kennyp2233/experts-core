import { PartialType } from '@nestjs/swagger';
import { CreateTipoEmbarqueDto } from './create-tipo-embarque.dto';

export class UpdateTipoEmbarqueDto extends PartialType(CreateTipoEmbarqueDto) {}