import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  FINCA = 'FINCA',
  CLIENTE = 'CLIENTE',
}

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: UserRole,
    example: 'ADMIN',
    description: 'Nuevo rol para el usuario',
  })
  @IsNotEmpty({ message: 'El rol es requerido' })
  @IsEnum(UserRole, { message: 'El rol debe ser USER, ADMIN, FINCA o CLIENTE' })
  role: UserRole;
}
