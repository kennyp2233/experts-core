import { IsString, Length, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2FADto {
  @ApiProperty({
    description: 'Token temporal de la sesión 2FA',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  tempToken: string;

  @ApiProperty({
    description: 'Código TOTP de 6 dígitos',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  token: string;

  @ApiProperty({
    description: 'Confiar en este dispositivo por 30 días',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  trustDevice?: boolean;
}
