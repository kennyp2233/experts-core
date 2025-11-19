import { 
  IsString, 
  IsNotEmpty, 
  MinLength, 
  IsEmail, 
  IsOptional, 
  IsIn 
} from 'class-validator';

export class CreateWorkerDto {
  @IsOptional()
  @IsString()
  employeeId?: string; // Opcional - se genera automáticamente si no se proporciona

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  lastName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un email válido' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  profilePhoto?: string;

  @IsString()
  @IsNotEmpty({ message: 'El depot es requerido' })
  depotId: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
    message: 'El status debe ser ACTIVE, INACTIVE o SUSPENDED'
  })
  status?: string;
}
