import { IsNotEmpty, IsString } from 'class-validator';

export class GetShiftAuditDto {
  @IsNotEmpty()
  @IsString()
  shiftId: string;
}