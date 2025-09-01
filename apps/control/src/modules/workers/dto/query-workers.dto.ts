import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsIn, IsNumber, Min, Max } from 'class-validator';

export class QueryWorkersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La página debe ser un número' })
  @Min(1, { message: 'La página debe ser mayor a 0' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El límite debe ser un número' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(100, { message: 'El límite máximo es 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
    message: 'El status debe ser ACTIVE, INACTIVE o SUSPENDED'
  })
  status?: string;

  @IsOptional()
  @IsString()
  depotId?: string;

  @IsOptional()
  @IsIn(['createdAt', 'firstName', 'lastName', 'employeeId'], {
    message: 'sortBy debe ser uno de: createdAt, firstName, lastName, employeeId'
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sortOrder debe ser asc o desc'
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
