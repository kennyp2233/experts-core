import { Expose } from 'class-transformer';

export class WorkerInfoDto {
  @Expose()
  id: string;

  @Expose()
  employeeId: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  depot: {
    id: string;
    name: string;
  };
}

export class DeviceInfoDto {
  @Expose()
  id: string;

  @Expose()
  deviceId: string;

  @Expose()
  model?: string;

  @Expose()
  platform?: string;
}

export class SessionInfoDto {
  @Expose()
  sessionToken: string;

  @Expose()
  worker: WorkerInfoDto;

  @Expose()
  device: DeviceInfoDto;

  @Expose()
  loginTime: Date;

  @Expose()
  lastActivity: Date;

  @Expose()
  expiresAt?: Date;
}

export class LoginQRResponseDto {
  qrToken: string;
  workerId: string;
  worker?: {
    employeeId: string;
    firstName: string;
    lastName: string;
  };
  expiresAt?: Date;
  generatedAt: Date;
}

export class AuthResponseDto {
  success: boolean;
  data: SessionInfoDto;
  message: string;
}

export class QRGenerateResponseDto {
  success: boolean;
  data: LoginQRResponseDto;
  message: string;
}
