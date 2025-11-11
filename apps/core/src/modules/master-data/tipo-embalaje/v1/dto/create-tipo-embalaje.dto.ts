import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTipoEmbalajeDto {
  @ApiProperty({
    description: 'Nombre del tipo de embalaje',
    example: 'Caja de cartón',
  })
  @IsString()
  nombre: string;
}