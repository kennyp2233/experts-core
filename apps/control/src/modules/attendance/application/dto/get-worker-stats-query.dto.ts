import {
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class GetWorkerStatsQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['7d', '30d', '90d', '1y'])
  period?: '7d' | '30d' | '90d' | '1y';
}