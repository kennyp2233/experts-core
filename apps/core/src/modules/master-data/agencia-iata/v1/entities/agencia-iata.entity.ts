import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgenciaIataEntity {
  @ApiProperty({
    description: 'ID de la agencia IATA',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del shipper',
    example: 'Empresa Shipper S.A.',
  })
  nombreShipper: string;

  @ApiPropertyOptional({
    description: 'RUC del shipper',
    example: '1234567890001',
  })
  rucShipper?: string;

  @ApiPropertyOptional({
    description: 'Dirección del shipper',
    example: 'Av. Principal 123',
  })
  direccionShipper?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del shipper',
    example: '+593987654321',
  })
  telefonoShipper?: string;

  @ApiPropertyOptional({
    description: 'Ciudad del shipper',
    example: 'Quito',
  })
  ciudadShipper?: string;

  @ApiPropertyOptional({
    description: 'País del shipper',
    example: 'Ecuador',
  })
  paisShipper?: string;

  @ApiPropertyOptional({
    description: 'Nombre del carrier',
    example: 'Aerolínea Carrier Ltda.',
  })
  nombreCarrier?: string;

  @ApiPropertyOptional({
    description: 'RUC del carrier',
    example: '0987654321001',
  })
  rucCarrier?: string;

  @ApiPropertyOptional({
    description: 'Dirección del carrier',
    example: 'Aeropuerto Internacional',
  })
  direccionCarrier?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del carrier',
    example: '+593987654322',
  })
  telefonoCarrier?: string;

  @ApiPropertyOptional({
    description: 'Ciudad del carrier',
    example: 'Guayaquil',
  })
  ciudadCarrier?: string;

  @ApiPropertyOptional({
    description: 'País del carrier',
    example: 'Ecuador',
  })
  paisCarrier?: string;

  @ApiPropertyOptional({
    description: 'Código IATA del carrier',
    example: 'AV',
  })
  iataCodeCarrier?: string;

  @ApiPropertyOptional({
    description: 'Registro del exportador',
    example: 'EXP001',
  })
  registroExportador?: string;

  @ApiPropertyOptional({
    description: 'Código del operador',
    example: 'OP001',
  })
  codigoOperador?: string;

  @ApiPropertyOptional({
    description: 'Código del consolidador',
    example: 'CON001',
  })
  codigoConsolidador?: string;

  @ApiPropertyOptional({
    description: 'Comisión',
    example: 5.5,
  })
  comision?: number;

  @ApiPropertyOptional({
    description: 'Estado de la agencia IATA',
    example: true,
  })
  estado?: boolean;
}