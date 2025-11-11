import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAcuerdoArancelarioDto {
  @ApiProperty({
    description: 'Nombre del acuerdo arancelario',
    example: 'Acuerdo de Libre Comercio',
  })
  @IsString()
  nombre: string;
}

export class UpdateAcuerdoArancelarioDto {
  @ApiPropertyOptional({
    description: 'Nombre del acuerdo arancelario',
    example: 'Acuerdo de Libre Comercio',
  })
  @IsOptional()
  @IsString()
  nombre?: string;
}