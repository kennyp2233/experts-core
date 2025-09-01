import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max, IsIn } from 'class-validator';

export class QueryDepotsDto {
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
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isActive debe ser true o false' })
  isActive?: boolean;

  // Parámetros para búsqueda geográfica
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'nearLat debe ser un número' })
  @Min(-90, { message: 'nearLat debe estar entre -90 y 90 grados' })
  @Max(90, { message: 'nearLat debe estar entre -90 y 90 grados' })
  nearLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'nearLng debe ser un número' })
  @Min(-180, { message: 'nearLng debe estar entre -180 y 180 grados' })
  @Max(180, { message: 'nearLng debe estar entre -180 y 180 grados' })
  nearLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'withinKm debe ser un número' })
  @Min(0.1, { message: 'withinKm debe ser mayor a 0.1' })
  @Max(100, { message: 'withinKm no puede exceder 100 km' })
  withinKm?: number;

  @IsOptional()
  @IsIn(['name', 'createdAt', 'address', 'secretUpdatedAt'], {
    message: 'sortBy debe ser uno de: name, createdAt, address, secretUpdatedAt'
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sortOrder debe ser asc o desc'
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
