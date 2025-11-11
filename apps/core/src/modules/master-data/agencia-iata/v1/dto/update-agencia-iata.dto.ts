import { PartialType } from '@nestjs/swagger';
import { CreateAgenciaIataDto } from './create-agencia-iata.dto';

export class UpdateAgenciaIataDto extends PartialType(CreateAgenciaIataDto) {}