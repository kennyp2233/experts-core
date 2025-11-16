import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({
    description: 'Código TOTP de 6 dígitos para confirmar',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  token: string;
}
