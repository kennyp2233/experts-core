import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgenciaIataDto {
  @ApiProperty({
    description: 'Nombre del shipper',
    example: 'Empresa Shipper S.A.',
  })
  @IsString()
  nombreShipper: string;

  @ApiPropertyOptional({
    description: 'RUC del shipper',
    example: '1234567890001',
  })
  @IsOptional()
  @IsString()
  rucShipper?: string;

  @ApiPropertyOptional({
    description: 'Dirección del shipper',
    example: 'Av. Principal 123',
  })
  @IsOptional()
  @IsString()
  direccionShipper?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del shipper',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString()
  telefonoShipper?: string;

  @ApiPropertyOptional({
    description: 'Ciudad del shipper',
    example: 'Quito',
  })
  @IsOptional()
  @IsString()
  ciudadShipper?: string;

  @ApiPropertyOptional({
    description: 'País del shipper',
    example: 'Ecuador',
  })
  @IsOptional()
  @IsString()
  paisShipper?: string;

  @ApiPropertyOptional({
    description: 'Nombre del carrier',
    example: 'Aerolínea Carrier Ltda.',
  })
  @IsOptional()
  @IsString()
  nombreCarrier?: string;

  @ApiPropertyOptional({
    description: 'RUC del carrier',
    example: '0987654321001',
  })
  @IsOptional()
  @IsString()
  rucCarrier?: string;

  @ApiPropertyOptional({
    description: 'Dirección del carrier',
    example: 'Aeropuerto Internacional',
  })
  @IsOptional()
  @IsString()
  direccionCarrier?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del carrier',
    example: '+593987654322',
  })
  @IsOptional()
  @IsString()
  telefonoCarrier?: string;

  @ApiPropertyOptional({
    description: 'Ciudad del carrier',
    example: 'Guayaquil',
  })
  @IsOptional()
  @IsString()
  ciudadCarrier?: string;

  @ApiPropertyOptional({
    description: 'País del carrier',
    example: 'Ecuador',
  })
  @IsOptional()
  @IsString()
  paisCarrier?: string;

  @ApiPropertyOptional({
    description: 'Código IATA del carrier',
    example: 'AV',
  })
  @IsOptional()
  @IsString()
  iataCodeCarrier?: string;

  @ApiPropertyOptional({
    description: 'Registro del exportador',
    example: 'EXP001',
  })
  @IsOptional()
  @IsString()
  registroExportador?: string;

  @ApiPropertyOptional({
    description: 'Código del operador',
    example: 'OP001',
  })
  @IsOptional()
  @IsString()
  codigoOperador?: string;

  @ApiPropertyOptional({
    description: 'Código del consolidador',
    example: 'CON001',
  })
  @IsOptional()
  @IsString()
  codigoConsolidador?: string;

  @ApiPropertyOptional({
    description: 'Comisión',
    example: 5.5,
  })
  @IsOptional()
  @IsNumber()
  comision?: number;

  @ApiPropertyOptional({
    description: 'Estado de la agencia IATA',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}