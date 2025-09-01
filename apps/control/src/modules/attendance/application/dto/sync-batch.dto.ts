import { 
  IsArray, 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsISO8601, 
  ValidateNested, 
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecordAttendanceDto } from './record-attendance.dto';

export class SyncBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordAttendanceDto)
  @ArrayMaxSize(50)
  records: RecordAttendanceDto[];

  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsOptional()
  @IsISO8601()
  lastSyncAt?: string;

  @IsNotEmpty()
  @IsString()
  batchId: string;
}

export class SyncResultDto {
  @IsNotEmpty()
  @IsString()
  localId: string; // timestamp or local ID from device

  @IsNotEmpty()
  @IsString()
  status: 'SUCCESS' | 'ERROR';

  @IsOptional()
  @IsString()
  recordId?: string;

  @IsOptional()
  @IsString()
  validationStatus?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  fraudScore?: number;
}

export class BatchSyncResponseDto {
  @IsNotEmpty()
  @IsString()
  batchId: string;

  processedCount: number;
  successCount: number;
  errorCount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncResultDto)
  results: SyncResultDto[];

  @IsISO8601()
  syncedAt: string;
}
