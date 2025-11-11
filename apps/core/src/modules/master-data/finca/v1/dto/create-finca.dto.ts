import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFincaDto {
  @ApiProperty({
    description: 'Nombre de la finca',
    example: 'Finca Los Andes',
  })
  @IsNotEmpty({ message: 'El nombre de la finca es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombreFinca: string;

  @ApiPropertyOptional({
    description: 'Tag identificador de la finca',
    example: 'FA001',
  })
  @IsOptional()
  @IsString({ message: 'El tag debe ser una cadena de texto' })
  tag?: string;

  @ApiPropertyOptional({
    description: 'RUC de la finca',
    example: '1234567890001',
  })
  @IsOptional()
  @IsString({ message: 'El RUC debe ser una cadena de texto' })
  rucFinca?: string;

  @ApiProperty({
    description: 'Tipo de documento',
    example: 'RUC',
  })
  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  @IsString({ message: 'El tipo de documento debe ser una cadena de texto' })
  tipoDocumento: string;

  @ApiPropertyOptional({
    description: 'Indica si genera guías certificadas',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Genera guías certificadas debe ser un valor booleano' })
  generaGuiasCertificadas?: boolean;

  @ApiPropertyOptional({
    description: 'Teléfono de información general',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  iGeneralTelefono?: string;

  @ApiPropertyOptional({
    description: 'Email de información general',
    example: 'info@fincalosandes.com',
  })
  @IsOptional()
  @IsString({ message: 'El email debe ser una cadena de texto' })
  iGeneralEmail?: string;

  @ApiPropertyOptional({
    description: 'Ciudad de información general',
    example: 'Quito',
  })
  @IsOptional()
  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  iGeneralCiudad?: string;

  @ApiPropertyOptional({
    description: 'Provincia de información general',
    example: 'Pichincha',
  })
  @IsOptional()
  @IsString({ message: 'La provincia debe ser una cadena de texto' })
  iGeneralProvincia?: string;

  @ApiPropertyOptional({
    description: 'País de información general',
    example: 'Ecuador',
  })
  @IsOptional()
  @IsString({ message: 'El país debe ser una cadena de texto' })
  iGeneralPais?: string;

  @ApiPropertyOptional({
    description: 'Código SESA de información general',
    example: 'EC001',
  })
  @IsOptional()
  @IsString({ message: 'El código SESA debe ser una cadena de texto' })
  iGeneralCodSesa?: string;

  @ApiPropertyOptional({
    description: 'Código de país de información general',
    example: 'EC',
  })
  @IsOptional()
  @IsString({ message: 'El código de país debe ser una cadena de texto' })
  iGeneralCodPais?: string;

  @ApiPropertyOptional({
    description: 'Nombre del agricultor',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString({ message: 'El nombre del agricultor debe ser una cadena de texto' })
  aNombre?: string;

  @ApiPropertyOptional({
    description: 'Código del agricultor',
    example: 'AGR001',
  })
  @IsOptional()
  @IsString({ message: 'El código del agricultor debe ser una cadena de texto' })
  aCodigo?: string;

  @ApiPropertyOptional({
    description: 'Dirección del agricultor',
    example: 'Av. Principal 123',
  })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  aDireccion?: string;

  @ApiPropertyOptional({
    description: 'Estado de la finca',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  estado?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de los choferes asociados a la finca',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  choferesIds?: number[];

  @ApiPropertyOptional({
    description: 'IDs de los productos asociados a la finca',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  productosIds?: number[];
}

export class UpdateFincaDto {
  @ApiPropertyOptional({
    description: 'Nombre de la finca',
    example: 'Finca Los Andes',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombreFinca?: string;

  @ApiPropertyOptional({
    description: 'Tag identificador de la finca',
    example: 'FA001',
  })
  @IsOptional()
  @IsString({ message: 'El tag debe ser una cadena de texto' })
  tag?: string;

  @ApiPropertyOptional({
    description: 'RUC de la finca',
    example: '1234567890001',
  })
  @IsOptional()
  @IsString({ message: 'El RUC debe ser una cadena de texto' })
  rucFinca?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento',
    example: 'RUC',
  })
  @IsOptional()
  @IsString({ message: 'El tipo de documento debe ser una cadena de texto' })
  tipoDocumento?: string;

  @ApiPropertyOptional({
    description: 'Indica si genera guías certificadas',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Genera guías certificadas debe ser un valor booleano' })
  generaGuiasCertificadas?: boolean;

  @ApiPropertyOptional({
    description: 'Teléfono de información general',
    example: '+593987654321',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  iGeneralTelefono?: string;

  @ApiPropertyOptional({
    description: 'Email de información general',
    example: 'info@fincalosandes.com',
  })
  @IsOptional()
  @IsString({ message: 'El email debe ser una cadena de texto' })
  iGeneralEmail?: string;

  @ApiPropertyOptional({
    description: 'Ciudad de información general',
    example: 'Quito',
  })
  @IsOptional()
  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  iGeneralCiudad?: string;

  @ApiPropertyOptional({
    description: 'Provincia de información general',
    example: 'Pichincha',
  })
  @IsOptional()
  @IsString({ message: 'La provincia debe ser una cadena de texto' })
  iGeneralProvincia?: string;

  @ApiPropertyOptional({
    description: 'País de información general',
    example: 'Ecuador',
  })
  @IsOptional()
  @IsString({ message: 'El país debe ser una cadena de texto' })
  iGeneralPais?: string;

  @ApiPropertyOptional({
    description: 'Código SESA de información general',
    example: 'EC001',
  })
  @IsOptional()
  @IsString({ message: 'El código SESA debe ser una cadena de texto' })
  iGeneralCodSesa?: string;

  @ApiPropertyOptional({
    description: 'Código de país de información general',
    example: 'EC',
  })
  @IsOptional()
  @IsString({ message: 'El código de país debe ser una cadena de texto' })
  iGeneralCodPais?: string;

  @ApiPropertyOptional({
    description: 'Nombre del agricultor',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString({ message: 'El nombre del agricultor debe ser una cadena de texto' })
  aNombre?: string;

  @ApiPropertyOptional({
    description: 'Código del agricultor',
    example: 'AGR001',
  })
  @IsOptional()
  @IsString({ message: 'El código del agricultor debe ser una cadena de texto' })
  aCodigo?: string;

  @ApiPropertyOptional({
    description: 'Dirección del agricultor',
    example: 'Av. Principal 123',
  })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  aDireccion?: string;

  @ApiPropertyOptional({
    description: 'Estado de la finca',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  estado?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de los choferes asociados a la finca',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  choferesIds?: number[];

  @ApiPropertyOptional({
    description: 'IDs de los productos asociados a la finca',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  productosIds?: number[];
}