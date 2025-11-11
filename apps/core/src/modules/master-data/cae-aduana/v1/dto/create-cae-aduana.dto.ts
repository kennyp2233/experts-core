import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCaeAduanaDto {
  @ApiPropertyOptional({
    description: 'Código de aduana',
    example: 123,
  })
  @IsOptional()
  @IsNumber()
  codigoAduana?: number;

  @ApiProperty({
    description: 'Nombre del CAE Aduana',
    example: 'CAE Quito Norte',
  })
  @IsString()
  nombre: string;
}
