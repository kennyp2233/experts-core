import { PartialType } from '@nestjs/mapped-types';
import { CreateDepotDto } from './create-depot.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateDepotDto extends PartialType(CreateDepotDto) {
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive?: boolean;
}
