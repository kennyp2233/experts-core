import { PartialType } from '@nestjs/swagger';
import { CreateOrigenDto } from './create-origen.dto';

export class UpdateOrigenDto extends PartialType(CreateOrigenDto) {}

export * from './create-origen.dto';
export * from './pagination-response.dto';
