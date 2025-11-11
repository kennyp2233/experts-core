import { PartialType } from '@nestjs/swagger';
import { CreateSubAgenciaDto } from './create-sub-agencia.dto';

export class UpdateSubAgenciaDto extends PartialType(CreateSubAgenciaDto) {}