import { PartialType } from '@nestjs/swagger';
import { CreateConsignatarioDto } from './create-consignatario.dto';

export class UpdateConsignatarioDto extends PartialType(CreateConsignatarioDto) { }