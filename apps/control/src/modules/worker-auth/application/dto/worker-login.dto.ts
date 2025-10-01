import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  ValidateNested, 
  IsIn 
} from 'class-validator';
import { Type } from 'class-transformer';

export class BasicDeviceInfoDto {
  @IsString()
  @IsNotEmpty({ message: 'Device ID es requerido' })
  deviceId: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsString()
  @IsNotEmpty({ message: 'Platform es requerido' })
  @IsIn(['iOS', 'Android'], { message: 'Platform debe ser iOS o Android' })
  platform: string;

  @IsString()
  @IsNotEmpty({ message: 'App version es requerida' })
  appVersion: string;
}

export class WorkerLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Auth Token es requerido' })
  authToken: string;

  @ValidateNested()
  @Type(() => BasicDeviceInfoDto)
  deviceInfo: BasicDeviceInfoDto;
}
