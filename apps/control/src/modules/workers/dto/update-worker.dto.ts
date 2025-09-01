import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkerDto } from './create-worker.dto';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateWorkerDto extends PartialType(CreateWorkerDto) {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  profilePhoto?: string;

  @IsOptional()
  @IsString()
  depotId?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
    message: 'El status debe ser ACTIVE, INACTIVE o SUSPENDED'
  })
  status?: string;
}

export class UpdateWorkerStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
    message: 'El status debe ser ACTIVE, INACTIVE o SUSPENDED'
  })
  status: string;
}
