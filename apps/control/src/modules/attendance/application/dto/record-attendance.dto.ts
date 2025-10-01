import { 
  IsNotEmpty, 
  IsString, 
  IsIn, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  Min, 
  Max, 
  IsISO8601, 
  ValidateNested,
  IsObject,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ATTENDANCE_TYPE_VALUES } from '../../domain/enums/attendance-type.enum';

export class PhotoDimensionsDto {
  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;
}

export class PhotoMetadataDto {
  @IsISO8601()
  timestamp: string;

  @IsBoolean()
  hasCameraInfo: boolean;

  @IsNumber()
  @Min(1)
  fileSize: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhotoDimensionsDto)
  dimensions?: PhotoDimensionsDto;

  @IsOptional()
  @IsObject()
  cameraInfo?: {
    make?: string;
    model?: string;
    software?: string;
  };
}

export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(0)
  accuracy: number;

  @IsISO8601()
  timestamp: string;
}

export class RecordAttendanceDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(ATTENDANCE_TYPE_VALUES)
  type: string;

  @ValidateIf(o => !o.exceptionCode)
  @IsNotEmpty({ message: 'Se requiere qrCodeUsed o exceptionCode' })
  @IsString()
  qrCodeUsed?: string;

  @ValidateIf(o => !o.qrCodeUsed)
  @IsNotEmpty({ message: 'Se requiere qrCodeUsed o exceptionCode' })
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'El código de excepción debe ser exactamente 6 dígitos'
  })
  exceptionCode?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^data:image\/(jpeg|jpg|png|gif|webp);base64,/, {
    message: 'La foto debe ser una imagen base64 válida (jpeg, png, gif, webp)'
  })
  photo: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhotoMetadataDto)
  photoMetadata?: PhotoMetadataDto;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsISO8601()
  timestamp: string;

  @IsOptional()
  @IsBoolean()
  createdOffline?: boolean;
}
