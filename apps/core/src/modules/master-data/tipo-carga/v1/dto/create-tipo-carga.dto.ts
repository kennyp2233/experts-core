import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTipoCargaDto {
  @ApiProperty({
    description: 'Nombre del tipo de carga',
    example: 'Carga General',
  })
  @IsString()
  nombre: string;
}