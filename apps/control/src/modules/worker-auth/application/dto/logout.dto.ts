import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class LogoutResponseDto {
  success: boolean;
  message: string;
}
