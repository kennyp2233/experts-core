import { PartialType } from '@nestjs/swagger';
import { CreateCaeAduanaDto } from './create-cae-aduana.dto';

export class UpdateCaeAduanaDto extends PartialType(CreateCaeAduanaDto) {}

export * from './create-cae-aduana.dto';
export * from './pagination-response.dto';
